# Change password

- **Route/access:** `/account/password`; customer, staff, and admin roles.
- **Implementation:** [`ChangePassword.jsx`](../../src/pages/ChangePassword.jsx) and `AuthContext`/`googleSheetsService`.
- **Data flow:** The page submits the current and new password to `changeGoogleSheetsPassword`; the service checks API version and posts the `changePassword` action with the signed-in session token.
- **Behavior:** Success is displayed only after the backend confirms the password change. The backend updates the Users row and invalidates sessions when credentials change.
- **Troubleshooting:** Deploy the current Apps Script version, ensure the token remains valid, and verify that the user exists in `Users`. Do not edit password cells manually unless following the backend's expected credential format.
