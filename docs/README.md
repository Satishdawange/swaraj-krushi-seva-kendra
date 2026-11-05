# Technical documentation

This folder documents the website route surface and the Google Sheets backend. Start here, then use the dedicated references below.

## System references

- [Google Sheets integration](./google-sheets-integration.md): frontend connection, reads, writes, caching, offline behavior, and troubleshooting.
- [Google Apps Script backend](./google-apps-script.md): `Code.gs` deployment, sheet tabs, endpoint handlers, and maintenance.
- [API reference](./api-reference.md): action names, request shape, and response expectations.
- [Configuration](./configuration.md): environment variables, browser configuration, and deployment settings.

## Page documentation

| Page | Route | Access |
|---|---|---|
| [Home](./pages/home.md) | `/` | Public |
| [Products](./pages/products.md) | `/products` | Public |
| [Product detail](./pages/product-detail.md) | `/products/:id` | Public |
| [Product request](./pages/product-request.md) | `/product-request` | Public |
| [About](./pages/about.md) | `/about` | Public |
| [Services](./pages/services.md) | `/services` | Public |
| [Contact](./pages/contact.md) | `/contact` | Public |
| [Admin login](./pages/admin-login.md) | `/admin/login` | Public |
| [Customer portal](./pages/customer-portal.md) | `/customer/portal` | Customer |
| [Change password](./pages/change-password.md) | `/account/password` | Customer, staff, admin |
| [Admin dashboard](./pages/admin-dashboard.md) | `/admin/dashboard` | Admin |
| [Customers](./pages/customers.md) | `/admin/customers` | Staff, admin |
| [Create bill](./pages/create-bill.md) | `/admin/billing` | Staff, admin |
| [Bill history](./pages/bill-history.md) | `/admin/bills` | Staff, admin |
| [Create challan](./pages/create-challan.md) | `/admin/challan/create` | Staff, admin |
| [Challan history](./pages/challan-history.md) | `/admin/challans` | Staff, admin |
| [Inventory](./pages/inventory.md) | `/admin/inventory` | Staff, admin |
| [Inventory editor](./pages/inventory-manage.md) | `/admin/inventory/manage`, `/admin/inventory/manage/:id` | Admin |
| [Google Sheets integration](./pages/google-sheets.md) | `/admin/sheets` | Admin |

The route definitions and role guards are in [`src/App.jsx`](../src/App.jsx). Features are implemented in the corresponding file under `src/pages/`; service modules own data access and reusable business logic.

## Verification commands

From the repository root:

```powershell
npm test
npm run build
```

The test suite checks sheet-row normalization, dashboard calculations, session-related Apps Script handlers, and that the generated script advertises the same API version expected by the app.
