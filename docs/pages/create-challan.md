# Create challan

- **Route/access:** `/admin/challan/create`; staff and admin.
- **Implementation:** [`CreateChallan.jsx`](../../src/pages/CreateChallan.jsx), `googleSheetsService.saveDeliveryChallan()`, and `ChallanTemplate`.
- **Data flow:** Loads inventory, collects customer/delivery and item details, validates the form, then records a challan. The service persists local data and triggers the configured background Sheets sync when enabled.
- **Fields/output:** Customer/contact/address, date, delivery details, products/quantities, status/remarks, and printable challan.
- **Troubleshooting:** A background sync can fail independently of the local operation; inspect browser logs and the `Challans` tab. Use challan history to verify a row after saving.
