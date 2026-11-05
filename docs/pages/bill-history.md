# Bill history

- **Route/access:** `/admin/bills`; staff and admin.
- **Implementation:** [`BillHistory.jsx`](../../src/pages/BillHistory.jsx), `googleSheetsService.fetchRecentRecords()`, and `normalizeBillRow()`.
- **Data flow:** Requests ten recent bills per page with server search/pagination and fetches customer counts; if no rows are returned, it can consult `billingService.getAllCustomerBills()` as a compatibility fallback. Inventory is loaded for bill editing.
- **Behavior:** Search/filter, open bill detail, edit customer/date/payment/notes/items, recalculate totals/stock where supported, and render/download invoice output.
- **Data contract:** New bill records are in monthly tabs. Keep `Bill_No`, `Date`, customer/mobile, amount, payment, and `Items_JSON` columns intact.
- **Troubleshooting:** Check API read errors, month tabs, and `normalizeBillRow` aliases. Distinguish an empty search result from a failed live request.
