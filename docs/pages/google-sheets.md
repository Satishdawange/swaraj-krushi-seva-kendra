# Google Sheets integration admin page

- **Route/access:** `/admin/sheets`; admin only.
- **Implementation:** [`GoogleSheetsIntegration.jsx`](../../src/pages/GoogleSheetsIntegration.jsx).
- **Tabs:** Connection (ping, bulk export, customer sync, script copy), Properties (Settings key/value edits), Categories (insert/update/search), Services (create/update/portal visibility).
- **Data flow:** Page actions call functions in `googleSheetsService.js`; success is displayed after a checked Apps Script response, and failed reads/writes are surfaced in page status/errors.
- **Configuration:** URL is browser-local after successful ping; deployment must report `sksk-customer-portal-v11 (upgraded from sksk-customer-portal-v10)`. Tabs and deployment are documented in [integration](../google-sheets-integration.md), [Apps Script](../google-apps-script.md), and [configuration](../configuration.md).
- **Caution:** Bulk sync seeds empty tabs only. Review local data before use and do not export plaintext user credentials.
