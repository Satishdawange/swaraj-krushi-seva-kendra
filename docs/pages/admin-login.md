# Admin login

- **Route/access:** `/admin/login`, public entry point.
- **Implementation:** [`AdminLogin.jsx`](../../src/pages/AdminLogin.jsx), [`AuthContext.jsx`](../../src/context/AuthContext.jsx), and Apps Script auth actions.
- **Data flow:** `signIn(identifier, password)` first attempts Google Sheets/Apps Script login when a web-app URL exists. A successful login returns a session token and user; the context stores the token/user in browser storage and validates it on restore/focus/interval. Local/Supabase fallbacks are also present.
- **Session API:** `login`, `validateSession`, and `logout`; sessions are backed by `Auth_Sessions`. Passwords should not be stored in frontend documentation or committed files.
- **Troubleshooting:** A successful ping alone does not prove login works. Confirm the deployment exposes session actions and that the Users tab has valid user rows. If session restore fails, inspect the displayed authentication error and Apps Script execution log.
