# System Flow

## TGMCI Medical Records System

**Document Type:** System Flow Documentation  
**Prepared For:** Medical Records System Users, Maintainers, and Evaluators  
**Prepared On:** May 16, 2026  

---

## 1. Purpose

This document describes the working flow of the TGMCI Medical Records System. It explains how users move through the system, how records are created and updated, and how reports are produced from daily medical records activity.

---

## 2. Main User Flow

```text
User Login
  -> Protected Dashboard
  -> Patient Registry / Chart Station / Document Tracking
  -> Transaction Actions
  -> Reports and Audit Monitoring
  -> Settings or User Management when permitted
  -> Sign Out
```

Only authenticated active users can enter the protected workspace. Staff can access operational modules. Administrators can access additional account management and destructive actions.

---

## 3. Authentication and Access Flow

1. User opens the login page.
2. User signs in with Firebase Authentication.
3. The app reads the matching user profile from Firestore.
4. `ProtectedRoute` checks account status and role.
5. Active staff and admin users enter the dashboard.
6. Disabled users or users without the required role are blocked.

Role behavior:

- Staff: daily records work, chart transactions, tracking pages, reports, and limited settings.
- Admin: staff access plus user management, delete/cancel actions, and administrator controls.

---

## 4. Patient Registry Flow

```text
Patients Page
  -> Add Patient
  -> Validate case number, name, dates, and duplicate rules
  -> Save patient record
  -> Create or update linked chart record
  -> Display barcode and patient table
```

Patient records are the base data used by charts, document tracking, lab result requests, vital certificates, and medical reports.

When a patient is deleted:

- The patient row is removed.
- The linked chart record is removed when allowed.
- Related medical document, lab result, and vital certificate transactions are voided or removed based on the active workflow rules.
- Medical reports show the transaction as voided when needed for audit visibility.

---

## 5. Chart Station Flow

```text
Charts Station
  -> Search chart by case number or patient
  -> Borrow chart
  -> Record borrower, department, and timestamp
  -> Chart status becomes borrowed
  -> Return or cancel transaction
  -> Chart status returns to available
  -> Chart Report Logs are updated
```

Chart station activity writes chart movement logs. These logs feed the dashboard recent activities, chart report logs, borrowed chart list, and print/export reporting.

---

## 6. Chart Viewing Flow

```text
Chart Viewing
  -> User selects local chart files or folder
  -> Browser previews PDF/image files
  -> No files are uploaded by this module
  -> User clears session when finished
```

Chart viewing is a local browser preview tool. It helps users inspect chart files without writing those files into Firestore.

---

## 7. Medical Document Flow

```text
Medical Documents
  -> Select document type
  -> Add record
  -> Select patient from search modal
  -> Save as For Release
  -> Release record
  -> Enter receiver, relationship, and remarks
  -> Status becomes Released
  -> Released by is credited to the logged-in account
  -> Medical Reports are updated
```

Supported document types:

- Medical Certificate
- Clinical Abstract
- Certificate of Confinement

Deleting a medical document request cancels the existing transaction instead of creating a duplicate canceled row.

---

## 8. Lab Result Request Flow

```text
Lab Results
  -> Add request
  -> Select patient
  -> Enter copy count
  -> System computes total amount at PHP 2.00 per copy
  -> Record starts as Unpaid and For Release
  -> Release action opens release modal
  -> User must change payment status to Paid before release
  -> Enter receiver, relationship, and remarks
  -> Status becomes Released
  -> Medical Reports are updated
```

Unpaid lab results cannot be released. The release modal remains available so the user can change the payment status to paid before finishing the release.

---

## 9. Vital Certificate Flow

```text
Vital Certificates
  -> Select Birth, Death, or Fetal Death toggle
  -> Add record
  -> Select one or more certificate types
  -> Save as For Review and For Release
  -> Review record
  -> Enter reviewed-by name
  -> Release action appears after review
  -> Enter receiver, relationship, and release status
  -> Status becomes Released
  -> Medical Reports are updated
```

Certificate fields depend on the selected type:

- Birth: birthday field is used.
- Death: date of death field is used.
- Fetal Death: date of death field is used.

Vital certificate receivers do not include "Patient Itself" in the release dropdown.

---

## 10. Reports Flow

```text
Operational Pages
  -> Patient, chart, and tracking actions create data
  -> Dashboard summarizes realtime data
  -> Chart Report Logs show chart movement activity
  -> Medical Reports show medical document, lab result, and vital certificate transactions
  -> Print Reports provide print/export preview in one place
```

Report pages support searching, status filtering, date filtering, and role-aware delete/cancel actions.

---

## 11. Notification Flow

```text
Action Completed or Blocked
  -> Floating toast appears
  -> Toast is written to notification history when audit-enabled
  -> Bell notification dropdown displays recent system messages
  -> User may clear notifications
```

Notifications are used for success messages, action warnings, and important system feedback.

---

## 12. Settings and Administration Flow

Settings support:

- Appearance mode.
- Soft-light display comfort.
- Department and location lists.
- Report defaults.
- Session behavior.
- Audit and notification review.

User management supports:

- Viewing user accounts.
- Updating staff/admin role.
- Enabling or disabling accounts.
- Restricting administrator-only actions.

---

## 13. High-Level Data Flow

```text
React UI
  -> Service Layer
  -> Firebase Auth / Firestore
  -> Realtime Listeners
  -> Tables, Dashboard Cards, Notifications, and Reports
```

Primary Firestore collections:

- `users`
- `patients`
- `charts`
- `chartLogs`
- `medicalDocumentRequests`
- `labResultRequests`
- `vitalCertificateRequests`
- `departments`
- `settings`

---

## 14. End-to-End Daily Workflow

1. Staff signs in.
2. Staff registers or finds a patient.
3. Staff handles chart borrow, return, or viewing if needed.
4. Staff records medical document, lab result, or vital certificate requests.
5. Staff reviews and releases eligible records.
6. The system updates dashboard activity, notifications, and reports.
7. Admin reviews user access, report logs, and settings as needed.
8. User signs out after work.

