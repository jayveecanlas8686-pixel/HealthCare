// ============================================================
// MEDICARE+ HEALTHCARE APPOINTMENT SYSTEM
// Data Layer & localStorage Management
// ============================================================

// ------------------------------------------------------------
// DATE / ID UTILITIES
// ------------------------------------------------------------
function pad2(n) { return String(n).padStart(2, '0'); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateLong(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad2(m)} ${period}`;
}

function dayAbbrev(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

function generateId(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateRef(prefix = 'APT') {
  const ts = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${ts}${rand}`;
}

function getUrlParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// ------------------------------------------------------------
// DB LAYER
// ------------------------------------------------------------
const DB = {
  KEYS: {
    USERS: 'hc_users',
    DOCTORS: 'hc_doctors',
    SCHEDULES: 'hc_schedules',
    APPOINTMENTS: 'hc_appointments',
    RECORDS: 'hc_records',
    PRESCRIPTIONS: 'hc_prescriptions',
    BILLING: 'hc_billing',
    NOTIFICATIONS: 'hc_notifications',
    REVIEWS: 'hc_reviews',
    WISHLIST: 'hc_wishlist',
    INQUIRIES: 'hc_inquiries',
    SUPPORT: 'hc_support',
    SETTINGS: 'hc_settings',
    CURRENT_USER: 'hc_current_user',
    THEME: 'hc_theme',
    INITIALIZED: 'hc_initialized'
  },
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  },
  getAll(key) { return this.get(key) || []; },
  findAll(key, fn) { return this.getAll(key).filter(fn); },
  findOne(key, fn) { return this.getAll(key).find(fn) || null; },
  findById(key, id) { return this.getAll(key).find(i => i.id === id) || null; },
  insert(key, item) {
    const items = this.getAll(key);
    items.push(item);
    this.set(key, items);
    return item;
  },
  update(key, id, updates) {
    const items = this.getAll(key);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    this.set(key, items);
    return items[idx];
  },
  delete(key, id) {
    const items = this.getAll(key);
    const filtered = items.filter(i => i.id !== id);
    this.set(key, filtered);
    return filtered.length < items.length;
  }
};

// ------------------------------------------------------------
// STATIC REFERENCE DATA
// ------------------------------------------------------------
const SPECIALTIES = [
  { key: 'Cardiology', icon: '❤️', desc: 'Heart health, blood pressure & cardiovascular care' },
  { key: 'Dermatology', icon: '🧴', desc: 'Skin, hair & nail conditions' },
  { key: 'Pediatrics', icon: '🧒', desc: 'Child health, wellness & vaccinations' },
  { key: 'Neurology', icon: '🧠', desc: 'Brain, nerve & headache disorders' },
  { key: 'Orthopedics', icon: '🦴', desc: 'Bones, joints & musculoskeletal injuries' },
  { key: 'Dentistry', icon: '🦷', desc: 'Dental care, cleanings & oral health' },
  { key: 'Gynecology', icon: '🌷', desc: "Women's health & reproductive care" },
  { key: 'General Medicine', icon: '🩺', desc: 'Primary care & family medicine' }
];

const SERVICES = [
  { icon: '🏥', title: 'In-Person Consultations', desc: 'Visit our partner clinics for a hands-on examination with the specialist of your choice.' },
  { icon: '💻', title: 'Online Video Consultations', desc: 'Connect with licensed doctors from the comfort of your home via secure video calls.' },
  { icon: '🔁', title: 'Follow-up Checkups', desc: 'Discounted follow-up visits to track your recovery and adjust treatment plans.' },
  { icon: '🚑', title: 'Emergency Priority Booking', desc: 'Skip the queue with priority slots for urgent medical concerns.' },
  { icon: '💊', title: 'e-Prescriptions', desc: 'Receive digital prescriptions you can view, download and print anytime.' },
  { icon: '📁', title: 'Digital Medical Records', desc: 'Securely store and access your diagnoses, treatment plans and history.' },
  { icon: '🧾', title: 'Online Billing & Invoices', desc: 'Track consultation fees, payment status and download printable invoices.' },
  { icon: '🔔', title: 'Smart Reminders', desc: 'Automated reminders for appointments, medication and pending payments.' }
];

const HELP_FAQS = [
  { category: 'Booking', question: 'How do I book an appointment?', answer: 'Go to the Doctors page, choose a specialist, open their profile and click "Book Appointment". Select a date, time slot and consultation type, fill in your details and confirm.' },
  { category: 'Booking', question: 'Can I book an emergency appointment?', answer: 'Yes. When booking, select "Emergency Priority" as the appointment type. These appointments are flagged for priority handling by the doctor and clinic staff.' },
  { category: 'Booking', question: 'How do I know if a time slot is available?', answer: 'The booking page shows a live availability grid generated from the doctor\'s schedule. Slots that are already booked or blocked by the doctor are disabled automatically.' },
  { category: 'Appointments', question: 'How do I reschedule or cancel an appointment?', answer: 'Open "My Appointments", find the appointment and use the Reschedule or Cancel buttons. Cancelling releases the time slot back to general availability.' },
  { category: 'Appointments', question: 'What do the appointment statuses mean?', answer: 'Pending: awaiting confirmation. Confirmed: doctor has accepted the slot. Completed: the consultation has taken place. Cancelled: the appointment will not occur.' },
  { category: 'Payments', question: 'What payment methods are supported?', answer: 'This is a demo platform — Credit/Debit Card, GCash and PayPal are available as simulated payment method selections. No real transactions are processed.' },
  { category: 'Payments', question: 'How do I pay an outstanding invoice?', answer: 'Go to the Billing page, find the unpaid invoice and click "Mark as Paid" after selecting a demo payment method.' },
  { category: 'Records', question: 'Who can see my medical records?', answer: 'Only you and the doctors you have consulted can view your medical records and prescriptions. Admins can see aggregated data for platform management.' },
  { category: 'Records', question: 'Can I download my prescriptions?', answer: 'Yes, open Prescriptions and click "Print / Download" on any prescription to generate a printable version.' },
  { category: 'Reviews', question: 'When can I leave a review for a doctor?', answer: 'Reviews can only be submitted for appointments with a "Completed" status, ensuring feedback comes from patients who actually had a consultation.' },
  { category: 'Account', question: 'How do I reset my demo data?', answer: 'Go to Settings → Data Management and click "Reset Demo Data". This restores all sample patients, doctors, appointments and records to their original state.' },
  { category: 'Account', question: 'I forgot my demo password — what do I use?', answer: 'Use the demo credentials shown on the login page: patient@example.com, doctor@example.com or admin@example.com, all with password "password123".' }
];

// ------------------------------------------------------------
// SEED: USERS
// ------------------------------------------------------------
const DEMO_USERS = [
  { id: 1, role: 'patient', name: 'John Smith', email: 'patient@example.com', password: 'password123', phone: '+1 555-0142', dob: '1990-04-12', gender: 'Male', address: '221B Baker Street, New York, NY 10001', avatar: 'https://i.pravatar.cc/150?img=68', createdAt: '2025-01-10' },
  { id: 2, role: 'doctor', name: 'Dr. Sarah Mitchell', email: 'doctor@example.com', password: 'password123', phone: '+1 555-0188', doctorId: 1, avatar: 'https://i.pravatar.cc/150?img=47', createdAt: '2024-11-01' },
  { id: 3, role: 'admin', name: 'Admin User', email: 'admin@example.com', password: 'password123', phone: '+1 555-0100', avatar: 'https://i.pravatar.cc/150?img=58', createdAt: '2024-10-01' },
  { id: 4, role: 'patient', name: 'Maria Garcia', email: 'maria.garcia@example.com', password: 'password123', phone: '+1 555-0211', dob: '1985-09-23', gender: 'Female', address: '45 Oak Avenue, Brooklyn, NY 11201', avatar: 'https://i.pravatar.cc/150?img=32', createdAt: '2025-01-22' },
  { id: 5, role: 'patient', name: 'Robert Lee', email: 'robert.lee@example.com', password: 'password123', phone: '+1 555-0333', dob: '1978-02-14', gender: 'Male', address: '12 Cedar Lane, Queens, NY 11354', avatar: 'https://i.pravatar.cc/150?img=14', createdAt: '2025-02-05' },
  { id: 6, role: 'patient', name: 'Jennifer Davis', email: 'jennifer.davis@example.com', password: 'password123', phone: '+1 555-0455', dob: '1995-11-30', gender: 'Female', address: '88 Willow Court, Jersey City, NJ 07302', avatar: 'https://i.pravatar.cc/150?img=24', createdAt: '2025-02-18' }
];

// ------------------------------------------------------------
// SEED: DOCTORS
// ------------------------------------------------------------
const DEMO_DOCTORS = [
  {
    id: 1, userId: 2, name: 'Dr. Sarah Mitchell', specialty: 'Cardiology', gender: 'Female',
    photo: 'https://i.pravatar.cc/300?img=47', experience: 14,
    education: 'MD, Harvard Medical School · Fellowship in Cardiology, Mayo Clinic',
    clinicLocation: 'HeartCare Cardiology Center, 3rd Floor', city: 'New York',
    address: '120 Park Avenue, New York, NY 10017',
    consultationFee: 150, languages: ['English', 'Spanish'],
    about: 'Dr. Sarah Mitchell is a board-certified cardiologist with over 14 years of experience diagnosing and treating cardiovascular conditions. She specializes in preventive cardiology, heart failure management, and non-invasive cardiac imaging, helping patients build long-term heart-healthy habits.',
    rating: 4.8, reviewCount: 0, featured: true, status: 'active', createdAt: '2024-01-15'
  },
  {
    id: 2, userId: null, name: 'Dr. James Wilson', specialty: 'Dermatology', gender: 'Male',
    photo: 'https://i.pravatar.cc/300?img=12', experience: 10,
    education: 'MD, Stanford University School of Medicine · Residency in Dermatology, UCSF',
    clinicLocation: 'ClearSkin Dermatology Clinic, Suite 210', city: 'Los Angeles',
    address: '45 Sunset Boulevard, Los Angeles, CA 90028',
    consultationFee: 100, languages: ['English'],
    about: 'Dr. James Wilson focuses on medical and cosmetic dermatology, including acne treatment, skin cancer screening, and minor dermatologic procedures. He is passionate about patient education and long-term skin health.',
    rating: 4.6, reviewCount: 0, featured: true, status: 'active', createdAt: '2024-02-01'
  },
  {
    id: 3, userId: null, name: 'Dr. Emily Chen', specialty: 'Pediatrics', gender: 'Female',
    photo: 'https://i.pravatar.cc/300?img=45', experience: 8,
    education: "MD, Johns Hopkins University School of Medicine · Pediatric Residency, Children's Hospital of Philadelphia",
    clinicLocation: 'Little Steps Pediatric Care, Ground Floor', city: 'Chicago',
    address: '78 Maple Street, Chicago, IL 60601',
    consultationFee: 90, languages: ['English', 'Mandarin'],
    about: 'Dr. Emily Chen provides comprehensive pediatric care from infancy through adolescence, with a gentle approach to wellness visits, vaccinations, growth monitoring and developmental screenings.',
    rating: 4.9, reviewCount: 0, featured: false, status: 'active', createdAt: '2024-02-10'
  },
  {
    id: 4, userId: null, name: 'Dr. Michael Rodriguez', specialty: 'Neurology', gender: 'Male',
    photo: 'https://i.pravatar.cc/300?img=33', experience: 16,
    education: 'MD, Yale School of Medicine · Neurology Residency, Massachusetts General Hospital',
    clinicLocation: 'NeuroHealth Institute, 5th Floor', city: 'Boston',
    address: '200 Lakeshore Drive, Boston, MA 02108',
    consultationFee: 180, languages: ['English', 'Spanish'],
    about: 'Dr. Michael Rodriguez specializes in headache disorders, epilepsy, and neurodegenerative conditions, with a patient-centered approach to long-term neurological care and management.',
    rating: 4.7, reviewCount: 0, featured: true, status: 'active', createdAt: '2024-01-25'
  },
  {
    id: 5, userId: null, name: 'Dr. Olivia Brown', specialty: 'Orthopedics', gender: 'Female',
    photo: 'https://i.pravatar.cc/300?img=29', experience: 12,
    education: 'MD, Duke University School of Medicine · Orthopedic Surgery Residency, Hospital for Special Surgery',
    clinicLocation: 'Active Life Orthopedics, 2nd Floor', city: 'Austin',
    address: '310 Riverside Avenue, Austin, TX 78701',
    consultationFee: 130, languages: ['English'],
    about: 'Dr. Olivia Brown treats musculoskeletal injuries and chronic joint conditions, helping patients of all ages return to active, pain-free lifestyles through evidence-based, conservative-first care.',
    rating: 4.5, reviewCount: 0, featured: true, status: 'active', createdAt: '2024-03-01'
  },
  {
    id: 6, userId: null, name: 'Dr. David Kim', specialty: 'Dentistry', gender: 'Male',
    photo: 'https://i.pravatar.cc/300?img=15', experience: 9,
    education: 'DDS, University of Michigan School of Dentistry',
    clinicLocation: 'Bright Smile Dental Studio, 1st Floor', city: 'Seattle',
    address: '88 Pearl Street, Seattle, WA 98101',
    consultationFee: 80, languages: ['English', 'Korean'],
    about: 'Dr. David Kim provides general and cosmetic dentistry services, focused on preventive care, restorations and creating comfortable, anxiety-free patient experiences.',
    rating: 4.6, reviewCount: 0, featured: false, status: 'active', createdAt: '2024-03-10'
  },
  {
    id: 7, userId: null, name: 'Dr. Sophia Patel', specialty: 'Gynecology', gender: 'Female',
    photo: 'https://i.pravatar.cc/300?img=44', experience: 11,
    education: 'MD, University of Pennsylvania Perelman School of Medicine · OB-GYN Residency, NYU Langone',
    clinicLocation: 'WomenFirst Health Center, 4th Floor', city: 'Miami',
    address: '15 Birchwood Lane, Miami, FL 33101',
    consultationFee: 120, languages: ['English', 'Hindi', 'Gujarati'],
    about: "Dr. Sophia Patel offers compassionate women's health services including routine exams, prenatal care, and management of reproductive health conditions in a warm, judgment-free environment.",
    rating: 4.9, reviewCount: 0, featured: false, status: 'active', createdAt: '2024-02-20'
  },
  {
    id: 8, userId: null, name: 'Dr. Robert Garcia', specialty: 'General Medicine', gender: 'Male',
    photo: 'https://i.pravatar.cc/300?img=51', experience: 20,
    education: 'MD, University of Texas Southwestern Medical School',
    clinicLocation: 'Family Wellness Clinic, Ground Floor', city: 'Denver',
    address: '500 Oakwood Drive, Denver, CO 80202',
    consultationFee: 70, languages: ['English', 'Spanish'],
    about: 'Dr. Robert Garcia is a dedicated family medicine physician providing comprehensive primary care for patients of all ages, focusing on preventive health and chronic disease management.',
    rating: 4.4, reviewCount: 0, featured: false, status: 'active', createdAt: '2024-01-05'
  }
];

// ------------------------------------------------------------
// SEED: SCHEDULES (per doctor availability template)
// ------------------------------------------------------------
function buildSchedules() {
  return [
    { doctorId: 1, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '09:00', endTime: '17:00', slotDuration: 30, breakStart: '12:00', breakEnd: '13:00', blocked: [] },
    { doctorId: 2, workDays: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'], startTime: '10:00', endTime: '18:00', slotDuration: 30, breakStart: '13:00', breakEnd: '14:00', blocked: [] },
    { doctorId: 3, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '08:00', endTime: '15:00', slotDuration: 30, breakStart: '12:00', breakEnd: '12:30', blocked: [] },
    { doctorId: 4, workDays: ['Mon', 'Wed', 'Fri'], startTime: '09:00', endTime: '16:00', slotDuration: 30, breakStart: '12:00', breakEnd: '13:00', blocked: [] },
    { doctorId: 5, workDays: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '09:00', endTime: '17:00', slotDuration: 30, breakStart: '12:00', breakEnd: '13:00', blocked: [] },
    { doctorId: 6, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '09:00', endTime: '18:00', slotDuration: 30, breakStart: '13:00', breakEnd: '14:00', blocked: [] },
    { doctorId: 7, workDays: ['Mon', 'Tue', 'Wed', 'Fri'], startTime: '10:00', endTime: '17:00', slotDuration: 30, breakStart: '12:30', breakEnd: '13:30', blocked: [] },
    { doctorId: 8, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '08:00', endTime: '16:00', slotDuration: 30, breakStart: '12:00', breakEnd: '13:00', blocked: [] }
  ];
}

// ------------------------------------------------------------
// SEED BUILDERS THAT DEPEND ON "TODAY"
// ------------------------------------------------------------
function buildAppointments() {
  const t = todayStr();
  return [
    { id: 'apt1', refNumber: generateRef('APT'), patientId: 1, patientName: 'John Smith', patientEmail: 'patient@example.com', patientPhone: '+1 555-0142', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', date: addDays(t, 2), time: '10:00', type: 'in-person', status: 'confirmed', fee: 150, paymentStatus: 'unpaid', paymentMethod: null, symptoms: 'Chest discomfort and shortness of breath during light exercise over the past two weeks.', notes: '', createdAt: addDays(t, -3) },
    { id: 'apt2', refNumber: generateRef('APT'), patientId: 1, patientName: 'John Smith', patientEmail: 'patient@example.com', patientPhone: '+1 555-0142', doctorId: 2, doctorName: 'Dr. James Wilson', specialty: 'Dermatology', date: addDays(t, 7), time: '14:00', type: 'online', status: 'pending', fee: 100, paymentStatus: 'unpaid', paymentMethod: null, symptoms: 'Persistent itchy rash on left forearm, worsens at night.', notes: '', createdAt: addDays(t, -1) },
    { id: 'apt3', refNumber: generateRef('APT'), patientId: 1, patientName: 'John Smith', patientEmail: 'patient@example.com', patientPhone: '+1 555-0142', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', date: addDays(t, -10), time: '09:30', type: 'in-person', status: 'completed', fee: 150, paymentStatus: 'paid', paymentMethod: 'card', symptoms: 'Annual heart health checkup and ECG review.', notes: 'Patient presents in good cardiovascular health. ECG shows normal sinus rhythm. Recommended continued moderate exercise and annual follow-up.', createdAt: addDays(t, -20) },
    { id: 'apt4', refNumber: generateRef('APT'), patientId: 1, patientName: 'John Smith', patientEmail: 'patient@example.com', patientPhone: '+1 555-0142', doctorId: 4, doctorName: 'Dr. Michael Rodriguez', specialty: 'Neurology', date: addDays(t, -30), time: '11:00', type: 'in-person', status: 'completed', fee: 180, paymentStatus: 'paid', paymentMethod: 'gcash', symptoms: 'Recurring migraines with visual aura, 2-3 times per week.', notes: 'Diagnosed with migraine without aura. Prescribed sumatriptan for acute episodes. Advised to maintain a headache diary and avoid known triggers.', createdAt: addDays(t, -35) },
    { id: 'apt5', refNumber: generateRef('APT'), patientId: 1, patientName: 'John Smith', patientEmail: 'patient@example.com', patientPhone: '+1 555-0142', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', date: addDays(t, -5), time: '15:00', type: 'follow-up', status: 'cancelled', fee: 150, paymentStatus: 'unpaid', paymentMethod: null, symptoms: 'Follow-up on blood pressure medication.', notes: '', createdAt: addDays(t, -12) },
    { id: 'apt6', refNumber: generateRef('APT'), patientId: 4, patientName: 'Maria Garcia', patientEmail: 'maria.garcia@example.com', patientPhone: '+1 555-0211', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', date: t, time: '09:00', type: 'in-person', status: 'confirmed', fee: 150, paymentStatus: 'paid', paymentMethod: 'card', symptoms: 'Routine cardiac follow-up after medication adjustment.', notes: '', createdAt: addDays(t, -7) },
    { id: 'apt7', refNumber: generateRef('APT'), patientId: 5, patientName: 'Robert Lee', patientEmail: 'robert.lee@example.com', patientPhone: '+1 555-0333', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', date: t, time: '11:30', type: 'online', status: 'confirmed', fee: 120, paymentStatus: 'unpaid', paymentMethod: null, symptoms: 'Reviewing recent lab results and blood pressure readings.', notes: '', createdAt: addDays(t, -4) },
    { id: 'apt8', refNumber: generateRef('APT'), patientId: 4, patientName: 'Maria Garcia', patientEmail: 'maria.garcia@example.com', patientPhone: '+1 555-0211', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', date: addDays(t, 3), time: '09:30', type: 'emergency', status: 'pending', fee: 250, paymentStatus: 'unpaid', paymentMethod: null, symptoms: 'Sudden severe chest pain radiating to left arm, requesting urgent priority slot.', notes: '', createdAt: t },
    { id: 'apt9', refNumber: generateRef('APT'), patientId: 1, patientName: 'John Smith', patientEmail: 'patient@example.com', patientPhone: '+1 555-0142', doctorId: 6, doctorName: 'Dr. David Kim', specialty: 'Dentistry', date: addDays(t, 14), time: '13:30', type: 'in-person', status: 'confirmed', fee: 80, paymentStatus: 'unpaid', paymentMethod: null, symptoms: 'Routine dental cleaning and checkup.', notes: '', createdAt: addDays(t, -2) },
    { id: 'apt10', refNumber: generateRef('APT'), patientId: 5, patientName: 'Robert Lee', patientEmail: 'robert.lee@example.com', patientPhone: '+1 555-0333', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', date: addDays(t, -15), time: '10:00', type: 'in-person', status: 'completed', fee: 150, paymentStatus: 'paid', paymentMethod: 'card', symptoms: 'Hypertension management consultation.', notes: 'Blood pressure well controlled on current dosage of Losartan. Continue current regimen, recheck in 3 months.', createdAt: addDays(t, -22) },
    { id: 'apt11', refNumber: generateRef('APT'), patientId: 4, patientName: 'Maria Garcia', patientEmail: 'maria.garcia@example.com', patientPhone: '+1 555-0211', doctorId: 3, doctorName: 'Dr. Emily Chen', specialty: 'Pediatrics', date: addDays(t, 1), time: '10:30', type: 'in-person', status: 'pending', fee: 90, paymentStatus: 'unpaid', paymentMethod: null, symptoms: "Child's routine wellness visit and vaccination check.", notes: '', createdAt: addDays(t, -1) },
    { id: 'apt12', refNumber: generateRef('APT'), patientId: 1, patientName: 'John Smith', patientEmail: 'patient@example.com', patientPhone: '+1 555-0142', doctorId: 5, doctorName: 'Dr. Olivia Brown', specialty: 'Orthopedics', date: addDays(t, -40), time: '14:30', type: 'in-person', status: 'completed', fee: 130, paymentStatus: 'paid', paymentMethod: 'gcash', symptoms: 'Persistent pain on outer elbow when gripping objects.', notes: 'Diagnosed with lateral epicondylitis (tennis elbow). Prescribed anti-inflammatory medication and recommended physical therapy exercises.', createdAt: addDays(t, -45) },
    { id: 'apt13', refNumber: generateRef('APT'), patientId: 6, patientName: 'Jennifer Davis', patientEmail: 'jennifer.davis@example.com', patientPhone: '+1 555-0455', doctorId: 2, doctorName: 'Dr. James Wilson', specialty: 'Dermatology', date: addDays(t, -8), time: '16:00', type: 'in-person', status: 'completed', fee: 100, paymentStatus: 'paid', paymentMethod: 'card', symptoms: 'Acne breakout consultation.', notes: 'Mild to moderate acne. Prescribed a topical treatment regimen.', createdAt: addDays(t, -15) },
    { id: 'apt14', refNumber: generateRef('APT'), patientId: 1, patientName: 'John Smith', patientEmail: 'patient@example.com', patientPhone: '+1 555-0142', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', date: addDays(t, -60), time: '10:00', type: 'in-person', status: 'cancelled', fee: 150, paymentStatus: 'unpaid', paymentMethod: null, symptoms: 'Initial consultation request (cancelled by patient).', notes: '', createdAt: addDays(t, -65) }
  ];
}

function buildRecords() {
  const apts = buildAppointments();
  const byId = id => apts.find(a => a.id === id);
  return [
    { id: 'rec1', patientId: 1, patientName: 'John Smith', appointmentId: 'apt3', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', diagnosis: 'Stable Angina (Mild)', symptoms: 'Occasional chest discomfort during exertion, resolves with rest.', treatmentPlan: 'Continue low-dose aspirin and statin therapy. Moderate aerobic exercise 30 minutes/day, 5x weekly. Low-sodium, heart-healthy diet.', notes: 'ECG normal sinus rhythm, no acute changes. Patient educated on warning signs requiring immediate care.', date: byId('apt3').date },
    { id: 'rec2', patientId: 1, patientName: 'John Smith', appointmentId: 'apt4', doctorId: 4, doctorName: 'Dr. Michael Rodriguez', specialty: 'Neurology', diagnosis: 'Migraine without Aura', symptoms: 'Recurring throbbing headaches, photophobia, nausea, 2-3 times weekly.', treatmentPlan: 'Sumatriptan 50mg as needed for acute attacks (max 2 per 24 hours). Maintain a headache diary, identify and avoid triggers, ensure adequate hydration and sleep.', notes: 'No neurological deficits on exam. Consider prophylactic therapy if frequency increases.', date: byId('apt4').date },
    { id: 'rec3', patientId: 1, patientName: 'John Smith', appointmentId: 'apt12', doctorId: 5, doctorName: 'Dr. Olivia Brown', specialty: 'Orthopedics', diagnosis: 'Lateral Epicondylitis (Tennis Elbow) - Right Arm', symptoms: 'Pain and tenderness over the lateral epicondyle, worsens with gripping and wrist extension.', treatmentPlan: 'NSAIDs for 14 days, rest from aggravating activity, physical therapy with eccentric strengthening exercises, consider counterforce brace.', notes: 'No signs of fracture or nerve involvement. Re-evaluate in 4 weeks if symptoms persist.', date: byId('apt12').date },
    { id: 'rec4', patientId: 5, patientName: 'Robert Lee', appointmentId: 'apt10', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', diagnosis: 'Essential Hypertension - Controlled', symptoms: 'Mild headaches, otherwise asymptomatic. Home BP readings around 138/88.', treatmentPlan: 'Continue Losartan 50mg once daily. Reduce sodium intake, monitor BP twice weekly, recheck in 3 months.', notes: 'Blood pressure trending well within target range on current regimen.', date: byId('apt10').date },
    { id: 'rec5', patientId: 6, patientName: 'Jennifer Davis', appointmentId: 'apt13', doctorId: 2, doctorName: 'Dr. James Wilson', specialty: 'Dermatology', diagnosis: 'Acne Vulgaris - Moderate', symptoms: 'Inflammatory papules and pustules on cheeks and forehead.', treatmentPlan: 'Topical retinoid nightly, benzoyl peroxide wash in the morning, oral antibiotic course for 6 weeks if no improvement.', notes: 'Advised on skincare routine and sun protection while on retinoid therapy.', date: byId('apt13').date }
  ];
}

function buildPrescriptions() {
  const apts = buildAppointments();
  const byId = id => apts.find(a => a.id === id);
  return [
    { id: 'rx1', patientId: 1, patientName: 'John Smith', appointmentId: 'apt3', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', date: byId('apt3').date, status: 'active', medicines: [
      { name: 'Aspirin', dosage: '81 mg', frequency: 'Once daily', duration: '90 days', instructions: 'Take with food in the morning' },
      { name: 'Atorvastatin', dosage: '20 mg', frequency: 'Once daily at bedtime', duration: '90 days', instructions: 'Avoid grapefruit juice' }
    ] },
    { id: 'rx2', patientId: 1, patientName: 'John Smith', appointmentId: 'apt4', doctorId: 4, doctorName: 'Dr. Michael Rodriguez', specialty: 'Neurology', date: byId('apt4').date, status: 'active', medicines: [
      { name: 'Sumatriptan', dosage: '50 mg', frequency: 'As needed (max 2 per 24 hrs)', duration: 'PRN - 30 day supply', instructions: 'Take at the first sign of migraine symptoms' }
    ] },
    { id: 'rx3', patientId: 1, patientName: 'John Smith', appointmentId: 'apt12', doctorId: 5, doctorName: 'Dr. Olivia Brown', specialty: 'Orthopedics', date: byId('apt12').date, status: 'completed', medicines: [
      { name: 'Ibuprofen', dosage: '400 mg', frequency: 'Every 8 hours', duration: '14 days', instructions: 'Take after meals to avoid stomach upset' }
    ] },
    { id: 'rx4', patientId: 5, patientName: 'Robert Lee', appointmentId: 'apt10', doctorId: 1, doctorName: 'Dr. Sarah Mitchell', specialty: 'Cardiology', date: byId('apt10').date, status: 'active', medicines: [
      { name: 'Losartan', dosage: '50 mg', frequency: 'Once daily', duration: '90 days', instructions: 'Monitor blood pressure regularly' }
    ] },
    { id: 'rx5', patientId: 6, patientName: 'Jennifer Davis', appointmentId: 'apt13', doctorId: 2, doctorName: 'Dr. James Wilson', specialty: 'Dermatology', date: byId('apt13').date, status: 'active', medicines: [
      { name: 'Tretinoin Cream 0.025%', dosage: 'Apply thin layer', frequency: 'Once nightly', duration: '60 days', instructions: 'Apply to clean, dry skin. Use sunscreen during the day' },
      { name: 'Benzoyl Peroxide Wash 5%', dosage: 'Apply to face', frequency: 'Once daily (morning)', duration: '60 days', instructions: 'Rinse thoroughly after 1-2 minutes' }
    ] }
  ];
}

function buildBilling() {
  const apts = buildAppointments();
  const byId = id => apts.find(a => a.id === id);
  let n = 1;
  const inv = (apptId, patientId, patientName, doctorId, doctorName, amount, status, method) => {
    const a = byId(apptId);
    return { id: 'inv' + (n), invoiceNumber: `INV-${new Date().getFullYear()}-${String(n++).padStart(4, '0')}`, appointmentId: apptId, patientId, patientName, doctorId, doctorName, date: a.date, amount, status, paymentMethod: method, items: [{ desc: `${a.type === 'emergency' ? 'Emergency Priority' : a.type === 'online' ? 'Online' : a.type === 'follow-up' ? 'Follow-up' : 'In-Person'} Consultation - ${a.specialty}`, amount }] };
  };
  return [
    inv('apt1', 1, 'John Smith', 1, 'Dr. Sarah Mitchell', 150, 'unpaid', null),
    inv('apt2', 1, 'John Smith', 2, 'Dr. James Wilson', 100, 'unpaid', null),
    inv('apt3', 1, 'John Smith', 1, 'Dr. Sarah Mitchell', 150, 'paid', 'card'),
    inv('apt4', 1, 'John Smith', 4, 'Dr. Michael Rodriguez', 180, 'paid', 'gcash'),
    inv('apt6', 4, 'Maria Garcia', 1, 'Dr. Sarah Mitchell', 150, 'paid', 'card'),
    inv('apt7', 5, 'Robert Lee', 1, 'Dr. Sarah Mitchell', 120, 'unpaid', null),
    inv('apt8', 4, 'Maria Garcia', 1, 'Dr. Sarah Mitchell', 250, 'unpaid', null),
    inv('apt9', 1, 'John Smith', 6, 'Dr. David Kim', 80, 'unpaid', null),
    inv('apt10', 5, 'Robert Lee', 1, 'Dr. Sarah Mitchell', 150, 'paid', 'card'),
    inv('apt12', 1, 'John Smith', 5, 'Dr. Olivia Brown', 130, 'paid', 'gcash'),
    inv('apt13', 6, 'Jennifer Davis', 2, 'Dr. James Wilson', 100, 'paid', 'card')
  ];
}

function buildNotifications() {
  const t = todayStr();
  return [
    { id: 'ntf1', userId: 1, title: 'Appointment Reminder', message: `Your appointment with Dr. Sarah Mitchell is on ${formatDate(addDays(t, 2))} at ${formatTime('10:00')}.`, type: 'reminder', read: false, date: addDays(t, -1) },
    { id: 'ntf2', userId: 1, title: 'Payment Pending', message: 'You have an unpaid invoice of $100 for your appointment with Dr. James Wilson.', type: 'payment', read: false, date: addDays(t, -1) },
    { id: 'ntf3', userId: 1, title: 'New Prescription Added', message: 'Dr. Sarah Mitchell added a new prescription after your recent visit.', type: 'prescription', read: true, date: addDays(t, -10) },
    { id: 'ntf4', userId: 1, title: 'Welcome to MediCare+', message: 'Thanks for joining MediCare+. Book your first appointment today!', type: 'system', read: true, date: addDays(t, -30) },
    { id: 'ntf5', userId: 2, title: 'New Appointment Booked', message: 'Maria Garcia booked an in-person appointment for today at 09:00 AM.', type: 'reminder', read: false, date: addDays(t, -7) },
    { id: 'ntf6', userId: 2, title: 'Appointment Cancelled', message: 'John Smith cancelled their follow-up appointment.', type: 'system', read: false, date: addDays(t, -12) },
    { id: 'ntf7', userId: 3, title: 'New Doctor Application', message: 'A new doctor profile is pending review.', type: 'system', read: false, date: addDays(t, -2) },
    { id: 'ntf8', userId: 3, title: 'Monthly Report Ready', message: 'The platform analytics report for last month is ready to view.', type: 'system', read: true, date: addDays(t, -5) }
  ];
}

function buildReviews() {
  const t = todayStr();
  return [
    { id: 'rev1', doctorId: 1, patientId: 1, patientName: 'John Smith', appointmentId: 'apt3', rating: 5, comment: 'Dr. Mitchell took the time to explain everything about my heart health in detail. Highly recommend!', date: addDays(t, -9) },
    { id: 'rev2', doctorId: 1, patientId: 5, patientName: 'Robert Lee', appointmentId: 'apt10', rating: 5, comment: 'Excellent care and very attentive to my concerns about blood pressure.', date: addDays(t, -14) },
    { id: 'rev3', doctorId: 1, patientId: 4, patientName: 'Maria Garcia', appointmentId: null, rating: 4, comment: 'Professional and knowledgeable, though the wait time was a bit long.', date: addDays(t, -25) },
    { id: 'rev4', doctorId: 1, patientId: 6, patientName: 'Jennifer Davis', appointmentId: null, rating: 5, comment: 'Best cardiologist I have visited. Clear communication and thorough exams.', date: addDays(t, -40) },
    { id: 'rev5', doctorId: 2, patientId: 6, patientName: 'Jennifer Davis', appointmentId: 'apt13', rating: 4, comment: 'Helped clear up my skin issues with a simple routine. Friendly staff.', date: addDays(t, -7) },
    { id: 'rev6', doctorId: 2, patientId: 1, patientName: 'John Smith', appointmentId: null, rating: 5, comment: 'Quick diagnosis and effective treatment plan for my rash.', date: addDays(t, -50) },
    { id: 'rev7', doctorId: 2, patientId: 5, patientName: 'Robert Lee', appointmentId: null, rating: 4, comment: 'Good experience overall, the online consultation was smooth.', date: addDays(t, -60) },
    { id: 'rev8', doctorId: 3, patientId: 4, patientName: 'Maria Garcia', appointmentId: null, rating: 5, comment: 'Wonderful with kids, my daughter loves visiting Dr. Chen.', date: addDays(t, -20) },
    { id: 'rev9', doctorId: 3, patientId: 6, patientName: 'Jennifer Davis', appointmentId: null, rating: 5, comment: 'Very patient and gentle approach with children.', date: addDays(t, -35) },
    { id: 'rev10', doctorId: 4, patientId: 1, patientName: 'John Smith', appointmentId: 'apt4', rating: 4, comment: 'Helped me understand my migraine triggers. Appreciated the detailed care.', date: addDays(t, -29) },
    { id: 'rev11', doctorId: 4, patientId: 5, patientName: 'Robert Lee', appointmentId: null, rating: 5, comment: 'Thorough neurological exam and clear explanations.', date: addDays(t, -45) },
    { id: 'rev13', doctorId: 5, patientId: 4, patientName: 'Maria Garcia', appointmentId: null, rating: 4, comment: 'Knowledgeable doctor, slightly rushed appointment.', date: addDays(t, -50) },
    { id: 'rev14', doctorId: 6, patientId: 1, patientName: 'John Smith', appointmentId: null, rating: 5, comment: 'Painless cleaning and very friendly staff.', date: addDays(t, -70) },
    { id: 'rev15', doctorId: 6, patientId: 6, patientName: 'Jennifer Davis', appointmentId: null, rating: 4, comment: 'Good service, slightly long wait time.', date: addDays(t, -80) },
    { id: 'rev16', doctorId: 7, patientId: 4, patientName: 'Maria Garcia', appointmentId: null, rating: 5, comment: 'Compassionate and thorough care throughout my visit.', date: addDays(t, -60) },
    { id: 'rev17', doctorId: 7, patientId: 6, patientName: 'Jennifer Davis', appointmentId: null, rating: 5, comment: 'Made me feel comfortable discussing sensitive topics.', date: addDays(t, -90) },
    { id: 'rev18', doctorId: 8, patientId: 5, patientName: 'Robert Lee', appointmentId: null, rating: 4, comment: 'Reliable family doctor, always thorough.', date: addDays(t, -100) },
    { id: 'rev19', doctorId: 8, patientId: 1, patientName: 'John Smith', appointmentId: null, rating: 4, comment: 'Good general checkup, would recommend.', date: addDays(t, -110) }
  ];
}

// ------------------------------------------------------------
// INIT / RESET
// ------------------------------------------------------------
function recalcAllDoctorRatings() {
  const doctors = DB.getAll(DB.KEYS.DOCTORS);
  const reviews = DB.getAll(DB.KEYS.REVIEWS);
  doctors.forEach(doc => {
    const docReviews = reviews.filter(r => r.doctorId === doc.id);
    if (docReviews.length) {
      const avg = docReviews.reduce((s, r) => s + r.rating, 0) / docReviews.length;
      doc.rating = Math.round(avg * 10) / 10;
      doc.reviewCount = docReviews.length;
    } else {
      doc.rating = 0;
      doc.reviewCount = 0;
    }
  });
  DB.set(DB.KEYS.DOCTORS, doctors);
}

function initDemoData(force = false) {
  if (!force && DB.get(DB.KEYS.INITIALIZED)) return;

  DB.set(DB.KEYS.USERS, DEMO_USERS);
  DB.set(DB.KEYS.DOCTORS, DEMO_DOCTORS);
  DB.set(DB.KEYS.SCHEDULES, buildSchedules());
  DB.set(DB.KEYS.APPOINTMENTS, buildAppointments());
  DB.set(DB.KEYS.RECORDS, buildRecords());
  DB.set(DB.KEYS.PRESCRIPTIONS, buildPrescriptions());
  DB.set(DB.KEYS.BILLING, buildBilling());
  DB.set(DB.KEYS.NOTIFICATIONS, buildNotifications());
  DB.set(DB.KEYS.REVIEWS, buildReviews());
  DB.set(DB.KEYS.WISHLIST, { 1: [2, 7], 4: [1, 3], 5: [1] });
  DB.set(DB.KEYS.INQUIRIES, []);
  DB.set(DB.KEYS.SUPPORT, []);
  DB.set(DB.KEYS.SETTINGS, {});
  if (!DB.get(DB.KEYS.THEME)) DB.set(DB.KEYS.THEME, 'light');
  recalcAllDoctorRatings();
  DB.set(DB.KEYS.INITIALIZED, true);
}

function resetDemoData() {
  const currentUser = DB.get(DB.KEYS.CURRENT_USER);
  const theme = DB.get(DB.KEYS.THEME);
  Object.values(DB.KEYS).forEach(k => {
    if (k !== DB.KEYS.CURRENT_USER && k !== DB.KEYS.THEME) localStorage.removeItem(k);
  });
  initDemoData(true);
  if (currentUser) DB.set(DB.KEYS.CURRENT_USER, currentUser);
  if (theme) DB.set(DB.KEYS.THEME, theme);
  if (typeof showToast === 'function') showToast('Demo data has been reset to defaults.', 'success');
}

// Run on load
initDemoData();
