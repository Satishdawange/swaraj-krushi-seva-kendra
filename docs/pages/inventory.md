# Inventory

- **Route/access:** `/admin/inventory`; staff and admin.
- **Implementation:** [`Inventory.jsx`](../../src/pages/Inventory.jsx) and `googleSheetsService`.
- **Data dependencies:** `fetchRecentRecords`, `fetchGoogleSheetRecords('Categories')`, `getLiveInventoryItems`, `adjustInventoryStock`, and `recordBulkPurchaseLot`. Inventory and purchase-lot rows are normalized through `sheetData.js`.
- **Tabs/workflows:** Current stock list with search/category/pagination; bulk purchase entry; purchase-lot history; stock alerts; quick stock adjustment. Purchase entries increase stock and update product costs/prices.
- **Permissions:** UI uses `useAuth()` to distinguish admin-only controls from staff workflows. Backend write access remains separate from React route guards.
- **Troubleshooting:** Check the exact Inventory and Purchase_Lots headers, IDs, numeric stock columns, and `Settings.low_stock_alert_qty`. A remote fetch error can leave cached inventory displayed.
