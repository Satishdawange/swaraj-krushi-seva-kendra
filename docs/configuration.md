# Configuration reference

## Google Sheets URL

The frontend resolves the Apps Script URL in this order:

1. `sksk_sheets_config.webAppUrl` in browser `localStorage` (set by the admin integration page after a successful ping).
2. `VITE_GOOGLE_SHEETS_API_URL` at Vite build time.
3. The built-in `DEFAULT_GOOGLE_SHEETS_API_URL` in [`googleSheetsService.js`](../src/service/googleSheetsService.js).

Use the Apps Script web-app deployment URL ending in `/exec`, not the Apps Script editor URL or a spreadsheet URL. The active URL is browser-local; saving it in one browser does not configure other browsers.

## Apps Script deployment

- Deploy as a Web app, executing as the spreadsheet owner.
- The app checks `action=ping` and requires API version `sksk-customer-portal-v11 (upgraded from sksk-customer-portal-v10)`.
- Publish a **new deployment version** after changing `Code.gs`; editing the source alone does not update a deployed version.
- Keep the web-app URL in the admin integration screen or provide it at build time.
- `initTabs` creates missing tabs and currently seeds default admin/staff users if `Users` is empty. Change those credentials immediately after initial setup.

The access choice in the Google deployment controls who can reach the endpoint. Use the access policy appropriate for the app's public/customer features and review the endpoint access rules before using real customer data.

## Other frontend environment variables

| Variable | Use |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL used by the optional Supabase auth path. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase browser/publishable key. |
| `VITE_OPENAI_API_KEY` | Optional OpenAI key fallback used by the AI advisor. |
| `VITE_GEMINI_API_KEY` | Optional Gemini key fallback used by the AI advisor. |

Create `.env.local` locally; do not commit real credentials. `VITE_` variables are included in browser bundles and are not secrets. The AI integration can also read provider keys from the Google Sheet `Settings` tab; those values are likewise delivered to browser code and must not be treated as confidential.

## Browser-side state

`googleSheetsService.js` stores the endpoint/status under `sksk_sheets_config`. Business data has local cache keys declared in `STORAGE_KEYS`; authentication uses `sksk_auth_session_token` plus the current-user key managed by `AuthContext`. Clearing browser storage removes this browser's settings/cache/session but does not delete Google Sheet rows.

## Health check

Use **Admin → Google Sheets Integration → Connection → Test Ping**. A successful result means:

- The URL is reachable from the browser.
- Apps Script returned JSON with `success: true`.
- Its `apiVersion` exactly matches `sksk-customer-portal-v11 (upgraded from sksk-customer-portal-v10)`.

The ping does not validate every sheet's schema or prove a write. Use the page's sync controls only after checking the sheet and reviewing the source/target data.
