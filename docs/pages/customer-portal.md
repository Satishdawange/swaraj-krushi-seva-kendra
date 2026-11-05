# Customer portal

- **Route/access:** `/customer/portal`, customer role only (guarded by `ProtectedRoute`).
- **Implementation:** [`CustomerPortal.jsx`](../../src/pages/CustomerPortal.jsx) and [`AuthContext.jsx`](../../src/context/AuthContext.jsx).
- **Data dependencies:** `fetchMyCustomerBills()` reads bills for the signed-in customer session, with local/legacy fallbacks; live inventory and shop settings support product browsing and contact information. `normalizeBillRow` and `normalizeInventoryRow` map sheet rows to UI data.
- **Privacy boundary:** The preferred bill path is Apps Script `getMyBills` using the session token, which filters by the session user's normalized mobile. The page must not use a general all-bills result as a substitute for that customer-specific path.
- **Troubleshooting:** Verify the user mobile/username maps to the bill's `Mobile`/`Customer_Mobile` and the customer session is valid. An empty customer result can also be a read/API failure; check network and Apps Script logs.
