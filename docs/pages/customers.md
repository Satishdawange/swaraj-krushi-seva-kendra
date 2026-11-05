# Customers

- **Route/access:** `/admin/customers`; staff and admin.
- **Implementation:** [`MyCustomers.jsx`](../../src/pages/MyCustomers.jsx).
- **Data dependencies:** `fetchAllShopCustomers`, `fetchAllConsultancyCustomers`, `fetchAllBills`, `fetchRecentRecords`, `syncCustomersWithSheet`, and `saveConsultancyCustomer` from `googleSheetsService`; shared shop values from `shopService`.
- **Behavior:** Switches between shop and consultancy customers, paginates/searches lists, derives shop customer purchase/balance summaries from customer/bill rows, and supports consultancy customer create/edit and customer synchronization.
- **Loading state:** The list displays an accessible spinner/status while the active customer page is being fetched, including initial load, filters, and pagination.
- **Data contract:** Shop totals are represented in `Customers`; consultancy records are stored in `Consultancy_Customers`; bills remain in monthly `Bills_YYYY_MM` tabs.
- **Consultancy row normalization:** Google Sheet rows use headers such as `Customer_Name`, `Mobile`, and `Status`; the page maps these to `name`, `mobile`, and normalized `Active`/`Inactive` values before rendering and filtering. Do not bind the table directly to raw sheet rows.
- **Troubleshooting:** Confirm mobile numbers normalize to the same last 10 digits across customer and bill records. Do not treat demo/default customers as verified Google Sheet rows.
