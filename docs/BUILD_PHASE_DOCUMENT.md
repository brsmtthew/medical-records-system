# Build Phase Document

## Medical Records System

**System Name:** TGMCI Medical Records System  
**Version:** 1.0.0  
**Release Name:** Medical-Records-System_V1.0_FULL  
**Document Type:** Build Phase Documentation  
**Prepared For:** Medical Records System Development and Deployment  
**Prepared On:** May 10, 2026  

---

## 1. Purpose

This document describes the build phase of the TGMCI Medical Records System. It explains how the system is assembled, configured, validated, and prepared for release. The document is intended for developers, maintainers, administrators, and evaluators who need to understand how the system is built from source code into a working application.

The build phase covers the frontend application, Firebase-backed data layer, Firestore security rules, server scaffold, validation commands, release checks, and operational readiness requirements.

---

## 2. System Overview

The TGMCI Medical Records System is a secure web-based records workspace for managing patient registry data, chart circulation, reporting, user access, system settings, and audit monitoring.

The system is designed for hospital medical records workflows where authorized personnel need to:

- Register inpatient and outpatient patient records.
- Generate and download patient barcode labels.
- Track physical chart borrowing and returning.
- View chart movement reports.
- Monitor dashboard analytics.
- Manage staff and administrator access.
- Configure departments, admission locations, and outpatient departments.
- Maintain audit logs for important actions.

The application uses a React frontend with Firebase Authentication and Firestore as the main authentication and realtime database platform. A Node.js and Express server scaffold is also included for future API/security expansion.

---

## 3. Build Scope

The build phase includes:

- Installing project dependencies.
- Configuring environment variables.
- Building the React/Vite frontend.
- Validating source code through linting.
- Running functional tests.
- Preparing Firestore security rules.
- Verifying Firebase configuration readiness.
- Reviewing deployment requirements.
- Confirming release acceptance criteria.

The build phase does not include:

- Creating production Firebase projects.
- Provisioning hospital user accounts.
- Uploading patient chart files.
- Migrating legacy patient data.
- Performing live production deployment unless explicitly scheduled.

---

## 4. Technology Stack

### Frontend

- React 19
- Vite 8
- Tailwind CSS
- Framer Motion
- Lucide React icons
- Recharts
- React Barcode
- HTML5 QR Code support

### Authentication and Database

- Firebase Authentication
- Cloud Firestore
- Firestore Security Rules

### Server Scaffold

- Node.js
- Express
- Helmet
- CORS
- Cookie Parser
- JSON Web Tokens
- BcryptJS
- Zod validation
- Express Rate Limit

### Build and Quality Tools

- npm
- ESLint
- Vite production build
- Node test runner

---

## 5. Project Structure

```text
medical-records-system/
  client/
    src/
      components/
      context/
      layouts/
      modals/
      pages/
      routes/
      services/
      utils/
    package.json
  server/
    config/
    controllers/
    middleware/
    models/
    routes/
    utils/
    validation/
    server.js
    package.json
  docs/
    BUILD_PHASE_DOCUMENT.md
  firebase.json
  firestore.rules
  package.json
  README.md
```

---

## 6. Major System Modules

### 6.1 Authentication Module

The authentication module manages sign-in, account creation, authenticated route protection, session timeout behavior, and role-aware access.

Primary files:

- `client/src/pages/Login.jsx`
- `client/src/context/AuthProvider.jsx`
- `client/src/routes/ProtectedRoute.jsx`
- `client/src/services/authService.js`
- `client/src/services/sessionService.js`

### 6.2 Patient Registry Module

The patient registry module supports creating, editing, viewing, deleting, filtering, and validating patient records. It also supports barcode display and barcode PNG download.

Primary files:

- `client/src/pages/Patients.jsx`
- `client/src/services/patientService.js`
- `client/src/services/recordsService.js`

### 6.3 Chart Tracking Module

The chart tracking module supports physical chart borrow and return workflows. It records borrowers, departments, returned-by details, and chart history.

Primary files:

- `client/src/pages/Charts.jsx`
- `client/src/services/chartService.js`
- `client/src/utils/chartTransactions.js`

### 6.4 Chart Viewing Module

The chart viewing module supports local-only preview of chart files such as PDF, JPG, PNG, and WEBP. Files are viewed in the browser and are not uploaded by this module.

Primary file:

- `client/src/pages/ChartViewing.jsx`

### 6.5 Reports Module

The reports module displays chart movement logs, filters activity, paginates report rows, prints report views, and exports Excel-compatible files for administrators.

Primary files:

- `client/src/pages/Reports.jsx`
- `client/src/services/chartService.js`

### 6.6 Dashboard Module

The dashboard module displays realtime analytics for patients, chart availability, chart movement, service distribution, and recent activity.

Primary file:

- `client/src/pages/Dashboard.jsx`

### 6.7 User Management Module

The user management module allows administrators to view staff accounts, update roles, block accounts, activate accounts, and review account status.

Primary files:

- `client/src/pages/Users.jsx`
- `client/src/pages/Settings.jsx`
- `client/src/services/userService.js`

### 6.8 Settings and Audit Module

The settings module controls appearance preferences, report defaults, session timeout, department lists, admission locations, outpatient departments, and audit logs.

Primary files:

- `client/src/pages/Settings.jsx`
- `client/src/utils/systemSettings.js`
- `client/src/utils/notificationLog.js`

---

## 7. Build Prerequisites

Before building the system, confirm that the workstation has:

- Node.js installed.
- npm installed.
- Firebase project details available.
- Repository source code available locally.
- Network access when installing dependencies or deploying Firebase rules.

Recommended command check:

```bash
node --version
npm --version
```

---

## 8. Dependency Installation

Install root, client, and server dependencies.

```bash
npm install
npm --prefix client install
npm --prefix server install
```

If dependencies already exist, this step may be skipped unless packages changed.

---

## 9. Environment Configuration

### 9.1 Client Environment

Create `client/.env` from `client/.env.example` or manually add the following values:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

The React application checks for missing or placeholder Firebase configuration before initializing Firebase.

### 9.2 Server Environment

Create `server/.env` from `server/.env.example` or manually add:

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

Never commit real `.env` files or production secrets.

---

## 10. Local Development Build

### 10.1 Start Frontend Development Server

```bash
npm run dev
```

Equivalent command:

```bash
npm --prefix client run dev -- --host 127.0.0.1
```

Default local URL:

```text
http://127.0.0.1:5173/
```

### 10.2 Start Server Scaffold

```bash
npm run dev:server
```

The server scaffold runs on the configured `PORT`, usually:

```text
http://127.0.0.1:5000/
```

---

## 11. Production Build Procedure

Run the production frontend build:

```bash
npm run build
```

This runs the client build script:

```bash
npm --prefix client run build
```

The Vite build outputs production assets to:

```text
client/dist/
```

The generated files include:

- `index.html`
- Compiled JavaScript bundles
- Compiled CSS
- Static image assets

---

## 12. Firestore Rules Build Step

Firestore rules are located at:

```text
firestore.rules
```

The Firebase configuration points to this file:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

Deploy Firestore rules before production use:

```bash
firebase deploy --only firestore:rules
```

Security rules enforce:

- Authenticated access.
- Active user requirement.
- Admin-only destructive actions.
- Staff-safe read and write access.
- Self-account read/update restrictions.
- Audit log creation tied to the signed-in user.
- Department management restricted to administrators.

---

## 13. Build Validation

Run all validation commands before release:

```bash
npm run lint
npm run build
npm run test:functional
```

### 13.1 Lint Validation

Command:

```bash
npm run lint
```

Purpose:

- Detect syntax issues.
- Enforce React hooks rules.
- Catch unused variables and unsafe patterns.

### 13.2 Production Build Validation

Command:

```bash
npm run build
```

Purpose:

- Confirm the application compiles successfully.
- Confirm Vite can transform all modules.
- Confirm production assets can be generated.

### 13.3 Functional Test Validation

Command:

```bash
npm run test:functional
```

Purpose:

- Validate chart transaction utility behavior.
- Validate notification normalization.
- Validate record sorting.
- Validate security sanitization helpers.

---

## 14. Build Output

The primary build artifact is:

```text
client/dist/
```

This folder contains the deployable frontend application.

The backend scaffold does not require a compile step. It is started with Node.js:

```bash
npm --prefix server run start
```

---

## 15. Security Build Considerations

The build must preserve the following controls:

- Firebase Authentication must be configured before protected modules are used.
- Firestore rules must be deployed before production data entry.
- Staff users must not access administrator-only routes.
- Admin-only delete and account-control actions must require confirmation.
- Sensitive patient and chart data must remain protected by Firebase Auth and Firestore rules.
- Input sanitization must run before Firestore writes.
- Local chart viewing must not upload files.
- Real environment secrets must remain outside the repository.

---

## 16. Performance Build Considerations

The current build includes performance-oriented behavior for CRUD operations:

- The authenticated user profile is synchronized from `AuthProvider` into the records service.
- CRUD writes avoid unnecessary repeated user-profile reads when the profile is already available.
- Patient and chart paired writes use Firestore batches where appropriate.
- Main confirmation buttons show immediate pending states such as `Saving...` or `Deleting...`.
- Duplicate click submissions are blocked while a write is in progress.
- Realtime Firestore listeners update tables after successful writes.

These controls reduce perceived delay after button clicks and reduce avoidable Firestore round trips.

---

## 17. Build Risks and Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Missing Firebase environment values | App cannot connect to Auth or Firestore | Validate `client/.env` before build and login testing |
| Firestore rules not deployed | Production data may be inaccessible or insecure | Deploy `firestore.rules` before production use |
| Real secrets committed | Security exposure | Keep `.env` files ignored and review `git status` |
| Failed lint or build | Release instability | Run validation commands before committing |
| Staff/admin role misconfiguration | Incorrect access control | Verify users collection role and account status |
| Large frontend bundle | Slower initial load | Consider route-level code splitting in future releases |
| Network latency to Firestore | Delayed CRUD confirmation | Keep pending UI states and minimize extra reads |

---

## 18. Release Checklist

Before tagging or submitting a release, confirm:

- Dependencies are installed.
- `client/.env` has valid Firebase values.
- `server/.env` exists if the server scaffold is used.
- Firestore rules are reviewed.
- `npm run lint` passes.
- `npm run build` passes.
- `npm run test:functional` passes.
- Login works for active users.
- Staff and admin roles are tested.
- Patient create, update, delete, and barcode download are tested.
- Chart borrow and return workflows are tested.
- Reports filtering, printing, pagination, and export are tested.
- Settings department management is tested.
- Audit logs are written for critical actions.
- No real `.env` files are staged.
- `git status --short` is reviewed.

---

## 19. Acceptance Criteria

The build phase is complete when:

- The frontend production build is generated successfully.
- All validation commands pass.
- Firebase Authentication initializes with valid configuration.
- Firestore reads and writes work for authorized users.
- Firestore rules enforce role-based access.
- Admin-only actions are unavailable to staff users.
- CRUD operations provide immediate UI feedback.
- The application can be run locally and prepared for deployment.
- No secrets or sensitive local files are included in source control.

---

## 20. Deployment Notes

A typical deployment sequence is:

1. Install dependencies.
2. Configure client and server environment values.
3. Run lint, build, and functional tests.
4. Deploy Firestore rules.
5. Deploy the contents of `client/dist/` to the chosen hosting platform.
6. Start or deploy the server scaffold if backend API features are required.
7. Create or verify administrator access.
8. Conduct post-deployment smoke testing.

Post-deployment smoke tests should include:

- Login.
- Dashboard load.
- Patient registration.
- Patient edit.
- Chart borrow.
- Chart return.
- Report filter.
- User role check.
- Settings update.
- Sign out.

---

## 21. Maintenance Notes

Future builds should consider:

- Adding route-level code splitting to reduce initial bundle size.
- Adding automated browser tests for critical workflows.
- Adding Firebase emulator-based integration tests.
- Expanding server-side APIs if workflows move away from direct Firestore access.
- Adding CI checks for lint, build, and functional tests.
- Adding a formal production deployment guide.

---

## 22. Build Command Summary

```bash
npm install
npm --prefix client install
npm --prefix server install
npm run lint
npm run build
npm run test:functional
firebase deploy --only firestore:rules
```

For development:

```bash
npm run dev
npm run dev:server
```

---

## 23. Conclusion

The TGMCI Medical Records System build phase prepares a secure, validated, and deployable records management application. The build process confirms that the React frontend compiles, functional logic passes tests, Firebase configuration is ready, Firestore security rules are prepared, and the system is suitable for controlled deployment and user acceptance testing.

