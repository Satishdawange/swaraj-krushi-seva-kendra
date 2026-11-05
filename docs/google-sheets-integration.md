# Google Sheets integration (frontend)

## Ownership and entry points

- UI/configuration: [`GoogleSheetsIntegration.jsx`](../src/pages/GoogleSheetsIntegration.jsx), route `/admin/sheets`.
- Data access and local fallbacks: [`googleSheetsService.js`](../src/service/googleSheetsService.js).
- Row normalization: [`sheetData.js`](../src/utils/sheetData.js).
- Generated Apps Script source: [`googleAppsScriptTemplate.js`](../src/utils/googleAppsScriptTemplate.js).
- API operation list: [API reference](./api-reference.md).

The integration screen has four tabs: **Connection**, **Properties**, **Categories**, and **Services**. It supports ping/configuration, bulk export, customer sync, editing Settings rows, category CRUD-by-ID (insert/update), service insert/update, and copying the Apps Script template.

## Connection and configuration flow

`getGoogleSheetsConfig()` reads the browser-local `sksk_sheets_config`, then falls back to `VITE_GOOGLE_SHEETS_API_URL`, then the built-in endpoint. A successful ping stores the tested URL, connection status, and timestamp. Ping validates the JSON API response and exact `sksk-customer-portal-v11 (upgraded from sksk-customer-portal-v10)` version; incompatible deployments are reported as errors rather than marked connected.

`autoSync` defaults to `true`. `saveGoogleSheetsConfig()` dispatches `sksk-sheets-config-change` after updates. The URL and status are not shared across browsers.

## Read behavior

`fetchGoogleSheetRecords(sheetName, forceRefresh)` sends a `GET` request with `action=getAll` and `sheetName`; an auth token is included when present. Successful arrays are cached for 15 seconds by endpoint URL and tab name. It reads only from the configured endpoint: it does not switch to a different, built-in spreadsheet if the configured URL fails. API/network/JSON errors throw so callers can distinguish an empty tab from a failed read.

Callers may deliberately catch a failed read and use local/seed data. Examples include category/service public pages, inventory cache fallback, and paginated history. The integration's **Refresh** operations show errors instead of treating failed reads as a successfully empty sheet.

`fetchRecentRecords()` uses `getRecent` for paginated data where possible. If a category/custom filter needs local application, it reads all rows, filters before slicing, and returns pagination metadata. Local storage is used when no live endpoint is available or a request fails.

## Write behavior

`sendGoogleSheetsActionForResult()` first checks `action=ping` and the API version, then POSTs JSON as `text/plain;charset=utf-8` with `{ action, data, token }`. It checks HTTP status, parses the JSON response, and throws when Apps Script returns `success: false`. `sendGoogleSheetsAction()` uses the same checked path.

Bill, inventory-item, purchase-lot, settings, category, service, consultancy-customer, product-request, stock-adjustment, challan/background sync, and bulk-sync operations therefore no longer count an opaque `no-cors` fetch as a successful Sheet write. Some background operations log failures rather than interrupting the foreground local operation; check the browser console and Sheet when investigating them.

Writes by ID update an existing row; unknown IDs append a row for categories, services, and consultancy customers. The current API has no general delete action; use an active/visibility field where supported.

## Data normalization

`sheetData.js` maps common alternate header spellings into normalized inventory, bill, purchase-lot, and settings fields. Keep the Apps Script headers documented in [Google Apps Script backend](./google-apps-script.md). Avoid renaming a header unless the frontend alias mapping and Apps Script schema are updated together.

## Important operational limits

- The API writes to Google Sheets; it is not a transactional database. Local cache and remote Sheet can diverge if a browser closes during a background operation.
- The browser's 15-second cache is per endpoint and sheet. Reloading the page clears the in-memory request cache; local business-data cache persists separately.
- A green ping validates the deployed API version, not every tab or write permission. Verify an operation's response and resulting row.
- A direct bulk export (`syncAll`) seeds empty tabs; it does not overwrite tabs that already contain data. The frontend excludes local users and passwords from its bulk-export payload.

## Troubleshooting

| Symptom | Check |
|---|---|
| Ping fails / CORS error | Confirm `/exec` URL, web-app deployment, Google permissions, and deployment access policy. Test from the deployed site origin. |
| Ping succeeds but a write reports version mismatch | Deploy the current template as a **new version** and retest. Both sides must report `sksk-customer-portal-v11 (upgraded from sksk-customer-portal-v10)`. |
| Read says API failure | Check the selected tab name and its header row. Read errors are no longer converted into an empty array. |
| A write says it succeeded but row isn't visible | Confirm the returned response and target tab/ID; check the Apps Script execution log. Background sync failures are logged in the browser console. |
| Wrong sheet's rows appear | Confirm the browser-local URL. The client now does not silently query the built-in endpoint when a custom URL is configured. |
| Settings UI seems stale | Reload the Settings tab, check the `Settings` header row (`Key`, `Value`, `Description`), and inspect `sksk_sheet_settings_cache`. |
