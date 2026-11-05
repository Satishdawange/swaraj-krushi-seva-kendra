# Create bill

- **Route/access:** `/admin/billing`; staff and admin.
- **Implementation:** [`CreateBill.jsx`](../../src/pages/CreateBill.jsx), [`billingService.js`](../../src/service/billingService.js), and `googleSheetsService.saveBillWithInventoryDeduction()`.
- **Data flow:** Loads live inventory and shop/consultancy customers; user selects a customer and products, enters quantities/payment/date, validates, previews, then saves. The backend creates a monthly bill, deducts inventory, and updates customer totals. Local bill/inventory/customer caches are updated after the save path.
- **Customer picker:** Shows only each customer's name with a plant emoji for consultancy customers or a shop emoji for shop customers. Consultancy entries take precedence when the same customer appears in both lists; selection still fills the contact/address fields and consultancy details.
- **Important fields:** Bill number/date, optional physical bill-book number, customer contact/address, items/quantities/prices, paid/balance amounts, payment mode, notes, consultancy marker/crop.
- **Outputs:** Confirmation/popup and printable/downloadable invoice via `InvoiceTemplate`, `html2canvas`, and `jsPDF`.
- **Troubleshooting:** Validate live inventory first; check item IDs and the selected month's `Bills_YYYY_MM` tab. A failed remote write now surfaces as an error rather than an opaque-fetch success. Check inventory and customer totals after any interrupted save.
