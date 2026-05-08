# Medical-Records-System_V1.0_FULL

TGMCI Medical Records System is a secured records workspace for patient registry, chart circulation, local chart viewing, reporting, user access control, settings, and audit monitoring.

## Version

- Release: `1.0.0`
- Release name: `Medical-Records-System_V1.0_FULL`
- Frontend: React + Vite + Tailwind CSS + Framer Motion
- Data/Auth: Firebase Authentication + Firestore
- Server scaffold: Node.js + Express security/API foundation

## Core Features

- Secure sign in and staff account creation with Firebase Auth.
- Role-based access for `admin` and `staff`.
- Patient registry with add, update, case-number edit, validation, barcode preview, and barcode PNG download.
- Chart station for borrowing and returning physical chart records.
- Realtime dashboard analytics for patients, chart availability, movement, services, and recent activity.
- Local-only chart viewing for PDF/JPG/PNG/WEBP files with zoom, rotate, fullscreen image preview, PDF page controls, sorting, recent history, and keyboard navigation.
- Reports page with filters, pagination, print support, Excel export for admins, and staff-safe view-only access.
- Admin user management with table view, search, sorting, profile pictures/initials, role updates, block, and activate.
- Settings for appearance, report defaults, configurable session timeout, departments, admission locations, outpatient departments, and audit logs.
- Audit logging for critical actions through centralized notification/audit records.
- Confidentiality acknowledgment and session-expiration warning for protected pages.

## Security Highlights

- Firestore rules require authenticated active users.
- Admin-only routes are protected in the router and sensitive service functions.
- Staff cannot access admin-only Users route.
- Staff report actions are hidden.
- Admin-only destructive actions require confirmation.
- Login attempt throttling applies temporary local lockout after repeated failures.
- Firebase environment values are checked for missing or placeholder config.
- Inputs are sanitized before writes.
- Local chart files are previewed only in the browser and are not uploaded by the chart viewing page.
- Real `.env` files are ignored and must never be committed.

## Project Structure

- `client/` - React + Vite frontend
- `server/` - Node.js + Express API/security scaffold
- `firestore.rules` - Firestore Security Rules for Firebase-backed data
- `README.md` - Project and release documentation

## Install

Install dependencies:

```bash
npm install
npm --prefix client install
npm --prefix server install
```

## Run Frontend

```bash
npm run dev
```

Equivalent client command:

```bash
npm --prefix client run dev -- --host 127.0.0.1
```

Default Vite URL:

```bash
http://127.0.0.1:5173/
```

## Build And Validate

```bash
npm run lint
npm run build
npm run test:functional
```

## Firebase Setup

Create `client/.env` from `client/.env.example`:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

Publish the Firestore rules before production use:

```bash
firebase deploy --only firestore:rules
```

## Server Scaffold

Create `server/.env` from `server/.env.example`:

```bash
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://127.0.0.1:5173
JWT_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CHART_FILES_DIR=../private/charts
AUDIT_LOG_PATH=./logs/audit.log
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123
```

Run server scaffold:

```bash
npm run dev:server
```

## GitHub Push Checklist

- Confirm `client/.env` and `server/.env` are not staged.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run test:functional`.
- Review `git status --short`.
- Commit with a release message such as `Release Medical-Records-System_V1.0_FULL`.

## Privacy Notice

This system handles sensitive medical record workflows. Access should be limited to authorized personnel, and patient data should be managed according to hospital policy and applicable privacy law.
