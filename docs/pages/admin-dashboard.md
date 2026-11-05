# Admin dashboard

- **Route/access:** `/admin/dashboard`, admin only.
- **Implementation:** [`AdminDashboard.jsx`](../../src/pages/AdminDashboard.jsx), [`dashboardAnalytics.js`](../../src/utils/dashboardAnalytics.js), and `googleSheetsService.getDashboardMetrics()`.
- **Data flow:** On load, displays matching device-local dashboard cache for the current user, then fetches fresh metrics. Query identity includes date range, category, bill search/status, page, and page limit; stale overlapping responses are ignored.
- **Filters/output:** Today/week/month/last month/selected month ranges, category, bill search/status and pagination; summary totals, charts, stock alerts, due customers, and challan summaries.
- **Cache:** `dashboardCache.js` keys data by account. Logout/clear-cache removes the user's stored metrics. Cache is a temporary display fallback, not the source of truth.
- **Troubleshooting:** `getDashboardMetrics` requires a staff/admin session. Confirm the Apps Script version and monthly bill tab names. A visible cached dashboard with a refresh error is stale; use the refresh error rather than assuming live success.
