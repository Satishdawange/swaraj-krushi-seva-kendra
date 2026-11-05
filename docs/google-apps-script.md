# Google Apps Script backend

## Source and deployment

The canonical script is the `GOOGLE_APPS_SCRIPT_CODE` template in [`src/utils/googleAppsScriptTemplate.js`](../src/utils/googleAppsScriptTemplate.js). The admin integration page copies this generated source as `Code.gs`.

1. Open the target spreadsheet, then **Extensions → Apps Script**.
2. Replace the editor source with the complete generated template and save.
3. Run/deploy as a Web app with the spreadsheet owner as the execution identity.
4. Choose an access policy appropriate for the public/customer routes.
5. Deploy, authorize spreadsheet access, and use the `/exec` URL in the application.
6. For later code changes, **Manage deployments → Edit → New version → Deploy**. Retest the URL from the website.

The script's `API_VERSION` is injected from the shared `GOOGLE_APPS_SCRIPT_API_VERSION` constant. The frontend and script must stay at `sksk-customer-portal-v11 (upgraded from sksk-customer-portal-v10)`. Ping returns the actual deployment version.

## Request/response contract

Both `doGet(e)` and `doPost(e)` call `handleRequest(e)`. GET parameters and JSON POST fields are merged into one parameter map. Responses are JSON objects; successful read operations include `success: true` and `data`, while failures include `success: false` and `error`.

POST requests use `Content-Type: text/plain;charset=utf-8` to avoid a browser preflight. The frontend reads the response and rejects failed API results. See [API reference](./api-reference.md) for action names and inputs.

## Spreadsheet tabs

`initAllTabs()` creates missing tabs and headers, preserving existing populated tabs. Main tabs:

| Tab | Purpose |
|---|---|
| `Stats` | Cached counters/summary values. |
| `Inventory` | Product inventory, prices, stock, alert thresholds, bilingual catalog fields, active flag. |
| `Purchase_Lots` | Purchase batch, cost, and supplier history. |
| `Bills` / `Bills_YYYY_MM` | Older bill tab and month-partitioned bills. New bills go to the corresponding monthly tab. |
| `Challans` | Delivery challans and serialized item lists. |
| `Customers` | Customer totals and outstanding balance. |
| `Users` | Login identities/roles. `getAll` does not expose this tab. |
| `Settings` | Key/value shop and feature settings. |
| `Products` | Public product catalog fields. |
| `Categories` | Category ID, names, active flag, sort order. |
| `Services` | Consultancy/service content and portal visibility. |
| `Consultancy_Customers` | Crop, area, status, and contact details for consultancy customers. |
| `Product_Requests` | Publicly submitted product-request entries. |
| `Auth_Sessions` | Session token hashes and credential fingerprints, created by auth routines. |

Important schemas are maintained in `initAllTabs()` in the template. Monthly bill rows include `Bill_No`, `Billbook_Bill_No`, `Date`, customer/contact fields, amounts, payment fields, `Items_JSON`, notes, timestamps, and consultancy fields.

`initAllTabs()` currently seeds `admin/admin123` and `staff/staff123` if `Users` is empty. Change these immediately after first initialization. Do not copy real passwords into documentation or source control.

## API operations

The dispatcher supports:

- Health/setup: `ping`, `initTabs`, `syncCustomers`.
- Reads: `getAll`, `getRecent`, `getStats`, `getDashboardMetrics`, `getMyBills`.
- Billing/inventory: `saveBill`, `saveChallan`, `saveInventoryItem`, `savePurchaseLot`, `adjustStock`.
- Account/session: `login`, `validateSession`, `logout`, `changePassword`, `ensureUser`.
- Configuration/catalog: `updateSetting`, `saveCategory`, `saveService`, `saveConsultancyCustomer`.
- Public form/bulk: `submitProductRequest`, `syncAll`.

Bill saves validate the date, append to the monthly bill tab, deduct stock, and update customer totals. Purchase-lot saves add to inventory. Inventory and catalog edits match by ID and append if no match exists. Product/service active flags are consumed by the corresponding public pages. No generic delete endpoint is currently implemented.

Auth-sensitive reads use the session validation helpers: staff/admin dashboard metrics and stats, and a customer's own bill list. Public product/catalog reads are projected to avoid returning admin-only inventory price fields where configured. Review access policy and endpoint-side action checks before using real customer records; Apps Script web-app access is separate from React route guards.

## Settings and script properties

The frontend reads `Settings` as a key/value list and writes `updateSetting`. Supported keys are application-defined; common ones include `shop_name`, `owner_name`, `phone`, `whatsapp`, `gst_number`, visibility flags, low-stock threshold, and AI provider keys. `Auth_Sessions` stores hashes/fingerprints, not the raw session token. Script properties are used by auth fingerprint routines; do not replace them with constants committed to the repository.

## Bulk sync behavior

`syncAll` calls `initAllTabs` and writes each provided dataset only when the corresponding tab has no data rows. It is a seed/import operation, not a destructive overwrite or ongoing two-way sync. The frontend's current payload excludes local users/passwords; the Apps Script retains a legacy `data.users` import mapping for older callers, so do not pass passwords through that field.

## Diagnostics

1. Open `/exec?action=ping` and verify `success`, `sheetName`, and `apiVersion`.
2. In Apps Script, inspect **Executions** for runtime errors.
3. Verify that the deployment is a new version, not merely a saved editor draft.
4. Check exact tab names and row-1 header cells.
5. Test reads and writes from the application UI and confirm the JSON result and resulting row.
6. If a monthly bill appears missing, inspect both the current `Bills_YYYY_MM` tab and legacy `Bills`.
