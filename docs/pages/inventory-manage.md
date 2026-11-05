# Inventory editor

- **Route/access:** `/admin/inventory/manage` and `/admin/inventory/manage/:id`; admin only.
- **Implementation:** [`InventoryManage.jsx`](../../src/pages/InventoryManage.jsx), `googleSheetsService.saveInventoryItem()`, and `normalizeInventoryRow()`.
- **Data flow:** Loads live inventory and category rows; the route ID selects edit mode, otherwise the form creates an item. The editor uses existing sheet headers where possible and supports normalized bilingual aliases. Save assigns/retains an ID, validates field values, and updates/inserts through the Apps Script inventory endpoint.
- **Fields:** Names/category/company in Marathi and English, pack/unit, purchase and sale prices, stock/alert threshold, product description/image/usage/crop, active status.
- **Troubleshooting:** Check Inventory tab schema and category IDs. For edit, verify the item ID matches the Sheet row. A rejected API response should be displayed; inspect Apps Script logs for write failures.
