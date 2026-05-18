# Medical-Records-System_V2.0_FULL Release Notes

## Version 2.0.0

This release finalizes the TGMCI Medical Records System for GitHub handoff.

## Included

- Secured Firebase Authentication login and staff account creation.
- Admin and staff role-based page access.
- Patient registry with add, update, case-number edit, delete for admin, validation, and barcode export.
- Chart borrowing and returning workflow with report logs and chart history.
- Local-only chart viewing with PDF/image preview tools.
- Dashboard analytics for patient mix, services, chart movement, and activity.
- Reports with filters, pagination, search highlighting, print support, Excel export for admins, and staff view-only mode.
- Admin Users page with table design, filters, search, sorting, role change, block, and activate actions.
- Settings for appearance, report defaults, configurable session timeout, departments, locations, and audit logs.
- Firestore Security Rules and service-layer role checks.
- Audit logging, confidentiality prompt, login attempt throttling, and session expiration warning.

## Final Validation Commands

```bash
npm run lint
npm run build
npm run test:functional
```

## Deployment Notes

- Deploy Firestore rules after pushing:

```bash
firebase deploy --only firestore:rules
```

- Do not commit `.env` files or private chart folders.
