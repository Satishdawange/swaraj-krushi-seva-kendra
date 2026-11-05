# Product request

- **Route/access:** `/product-request`, public.
- **Implementation:** [`ProductRequest.jsx`](../../src/pages/ProductRequest.jsx) and [`productRequestService.js`](../../src/service/productRequestService.js).
- **Data flow:** Form validation → `submitProductRequest` Google Sheets action → `Product_Requests` tab. The action returns a request ID/result and errors are shown to the user.
- **Fields:** Product name is required; optional short description and usage details provide context for the shop.
- **Troubleshooting:** Confirm the `Product_Requests` tab/header exists and that the deployed Apps Script reports `sksk-customer-portal-v11 (upgraded from sksk-customer-portal-v10)`. Product requests use the regular checked API sender; they are not treated as saved merely because a `no-cors` fetch resolved.
