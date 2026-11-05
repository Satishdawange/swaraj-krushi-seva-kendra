# Google Sheets API reference

All actions are dispatched by the Apps Script `handleRequest(e)` function. GET actions use query parameters; POST actions use JSON with `Content-Type: text/plain;charset=utf-8`. The standard envelope is `{ action, data?, token?, ...actionFields }`; responses are JSON and must be checked for `success`.

## Reads and health

| Action | Method | Parameters | Result |
|---|---|---|---|
| `ping` | GET | None | `success`, `apiVersion`, `timestamp`, `sheetName`. |
| `getAll` | GET | `sheetName`, optional `token` | All records from the requested tab. |
| `getRecent` | GET | `sheetName`, `page`, `limit`, `search`, `category`, optional `token` | `data`, `total`, `page`, `limit`, `totalPages`. |
| `getStats` | GET | `token` | Cached/updated stats; requires staff/admin session. |
| `getDashboardMetrics` | GET | `token`, `startDate`, `endDate`, `category`, `search`, `status`, `page`, `limit` | Dashboard totals, charts, inventory/customer summaries, paginated bills. |
| `getMyBills` | GET | Customer `token` | Bills associated with the authenticated customer's mobile number. |

## Writes and sessions

| Action | Method | `data` / top-level fields | Result |
|---|---|---|---|
| `saveBill` | POST | `data` bill object | Monthly bill number and save result; stock/customer totals are also updated. |
| `saveChallan` | POST | `data` challan object | Challan number and save result. |
| `saveInventoryItem` | POST | `data` inventory item | Insert/update result and ID. |
| `savePurchaseLot` | POST | `data` lot and inventory item | Purchase-lot result; stock is increased. |
| `adjustStock` | POST | top-level `id`, `delta`, `reason` | New stock quantity. |
| `updateSetting` | POST | `data: { key, value, description? }` | Insert/update result. |
| `saveCategory` | POST | `data` category fields | Insert/update result and category ID. |
| `saveService` | POST | `data` service fields | Insert/update result and service ID. |
| `saveConsultancyCustomer` | POST | `data` customer fields | Insert/update result and customer ID/mobile. |
| `submitProductRequest` | POST | `data` product name/description/usage | Request ID and save result. |
| `syncCustomers` | GET or POST | None | Customer count/result from bills. |
| `syncAll` | POST | `data` bulk datasets | Per-tab seeded counts; only empty tabs are seeded. |
| `initTabs` | GET or POST | None | Initialized tab summary. |
| `login` | POST | top-level `username`, `password` | User summary and session token on success. |
| `validateSession` | POST | top-level `token` | `valid`, optional `user`, reason. |
| `logout` | POST | top-level `token` | Revocation result. |
| `changePassword` | POST | top-level `token`, `currentPassword`, `newPassword` | Password update result. |
| `ensureUser` | POST | `data` with mobile/username and display name | Ensures a customer user entry. |

The integration service performs a ping/version check before writes and supplies the current session token in the request envelope. The expected version is `sksk-customer-portal-v11 (upgraded from sksk-customer-portal-v10)`. A request is successful only when the HTTP response is successful, valid JSON is returned, and the response has `success: true`.

## Sheet names

The app uses `Products`, `Categories`, `Inventory`, `Purchase_Lots`, `Bills`, monthly `Bills_YYYY_MM`, `Challans`, `Customers`, `Settings`, `Stats`, `Users`, `Services`, `Consultancy_Customers`, `Product_Requests`, and `Auth_Sessions`. The active Apps Script template is authoritative for exact column order and legacy aliases.

## Read/update semantics

- `getAll` returns rows as objects keyed by the header row.
- `getRecent` applies server-side paging/search where supported. The client can filter full rows locally for compatibility.
- `saveInventoryItem`, `saveCategory`, `saveService`, and `saveConsultancyCustomer` update matching IDs and append when absent.
- `saveBill` appends to a monthly tab; there is no generic update/delete action for bills.
- `syncAll` seeds empty tabs only; it does not replace populated data.
