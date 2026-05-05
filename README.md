# Medical Records System

A medical records management system for patient registry, chart circulation, chart viewing, reports, and role-based records administration.

## Project Structure

- `client/` - React + Vite frontend
- `server/` - Node.js + Express API scaffold
- `firestore.rules` - Firebase security rules for the current Firebase-backed data layer

## Frontend

Install and run:

```bash
cd client
npm install
npm run dev
```

Build:

```bash
cd client
npm run build
```

The root scripts also forward to the frontend:

```bash
npm run dev
npm run build
npm run lint
```

## Backend

Install and run:

```bash
cd server
npm install
npm run dev
```

API routes:

- `GET /api/health`
- `/api/auth`
- `/api/users`
- `/api/patients`
- `/api/charts`
- `GET /api/charts/files/:fileName` for authenticated local chart-file viewing

The backend is structured with routes, controllers, middleware, config, models, and utilities. It is ready for an API/database adapter while the existing frontend features continue to use Firebase.

## Environment Variables

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

Never commit real `.env` files, API keys, database URLs, JWT secrets, or private credentials.

## Security Notes

- Protected frontend routes require authentication.
- Role-based frontend access supports only `admin` and `staff`.
- Express routes include JWT authentication, role authorization, request validation, rate limiting, and global error handling middleware.
- Passwords in the Express auth scaffold are hashed with bcrypt-compatible hashing via `bcryptjs`.
- Access tokens are short-lived and refresh tokens are supported through secure HTTP-only cookies.
- Sensitive API responses use simple user-facing errors; detailed server errors are logged only on the backend.
- Audit logs are written as JSON lines to `AUDIT_LOG_PATH`.
- Scanned chart files must stay outside `client/public`; serve them only from `CHART_FILES_DIR` through authenticated `/api/charts/files/:fileName`.
- Inputs are validated and sanitized in the frontend utilities and server middleware.

## Security File Guide

- `server/middleware/authenticate.js` verifies JWT access tokens.
- `server/middleware/authorizeRoles.js` exports `requireRole(...)` to protect routes by role.
- `server/middleware/validateRequest.js` runs Zod validation schemas.
- `server/middleware/rateLimiters.js` limits login and sensitive API traffic.
- `server/middleware/errorHandler.js` prevents technical errors from leaking to users.
- `server/middleware/auditAction.js` records protected actions.
- `server/utils/auditLogger.js` writes audit events outside the frontend.
- `server/controllers/authController.js` handles login, logout, registration, refresh tokens, lockout, and bcrypt password checks.
- `server/controllers/chartController.js` serves local scanned chart files only after authentication and logs access.
- `client/src/services/sessionService.js` stores access tokens in session storage and clears them on expiry/logout.
- `client/src/routes/ProtectedRoute.jsx` protects frontend pages and keeps the inactivity timeout.
