# MediCare+ — Healthcare Appointment System (Demo)

A fully static, front-end-only demo of a healthcare appointment booking platform — patient/doctor/admin dashboards, doctor directory, appointment booking & calendar, medical records, prescriptions, billing, reviews, and notifications. Built with plain HTML, CSS and vanilla JavaScript. All data is simulated and stored in your browser's `localStorage`.

> ⚠️ **Demo Disclaimer**: This is a portfolio/demo project only. It is **not** a real medical platform, does not provide medical advice, and does not collect or transmit any real patient data. All accounts, doctors, appointments, records and invoices are sample data generated on first load.

## Running Locally

No build step, server, or dependencies required.

1. Download / clone this folder.
2. Open `index.html` directly in your browser (double-click it, or use "Open with" → your browser).
3. The app seeds demo data into `localStorage` automatically on first load.

## Demo Accounts

| Role    | Email                  | Password      |
|---------|------------------------|---------------|
| Patient | patient@example.com    | password123   |
| Doctor  | doctor@example.com     | password123   |
| Admin   | admin@example.com      | password123   |

You can also register a new patient account from `register.html`.

## Resetting Demo Data

A **"🔄 Reset Demo Data"** button is available on every page (bottom corner) and on the Settings page (Account section). It restores appointments, records, prescriptions, billing and notifications to their original seeded state — your login session and theme preference are preserved.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository (the `HealthCare` folder contents should be at the repo root, or in a `docs/` folder if you configure Pages that way).
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to "Deploy from a branch", choose your branch (e.g. `main`) and the root folder (`/`).
4. Save. Your site will be published at `https://<your-username>.github.io/<repo-name>/`.
5. Open the published `index.html` — everything works with relative paths, no server or environment variables needed.

## Project Structure

```
HealthCare/
├── index.html                   Landing page
├── about.html, services.html, contact.html, help-center.html
├── doctors.html, doctor-details.html
├── book-appointment.html, appointment-confirmation.html
├── login.html, register.html
├── patient-dashboard.html, doctor-dashboard.html, admin-dashboard.html
├── my-appointments.html, medical-records.html, prescriptions.html
├── billing.html, calendar.html, reviews.html, notifications.html, settings.html
└── assets/
    ├── css/style.css
    └── js/
        ├── data.js          localStorage "database" layer + seed data
        ├── app.js            shared UI helpers, nav/footer, theme, toasts, modals
        ├── auth.js           login/register logic
        ├── doctors.js        doctor directory & profile logic
        ├── appointments.js   booking & appointment management
        ├── dashboard.js      patient/doctor/admin dashboard widgets
        ├── calendar.js       monthly calendar & availability management
        ├── records.js        medical records, prescriptions, reviews
        └── billing.js        invoices & billing
```

## Notes

- All data lives in your browser's `localStorage` under the `hc_*` keys. Clearing site data / using a different browser starts fresh.
- Light/dark theme toggle is available from the navigation bar and remembered across sessions.
- This project is intended for demonstration and educational purposes only.
