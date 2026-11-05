# Challan history

- **Route/access:** `/admin/challans`; staff and admin.
- **Implementation:** [`ChallanHistory.jsx`](../../src/pages/ChallanHistory.jsx), `googleSheetsService.fetchRecentRecords()`, and `ChallanTemplate`.
- **Data flow:** Loads ten challans at a time with search, page count, and loading/error handling.
- **Behavior:** View/print challan, generate PDF with `html2canvas`/`jsPDF`, and navigate to bill creation for conversion workflows.
- **Data contract:** Uses `Challans` tab fields, with item arrays stored as `Items_JSON`.
- **Troubleshooting:** Verify `Challans` header names and page/search query results. PDF image/CORS issues are separate from API reads.
