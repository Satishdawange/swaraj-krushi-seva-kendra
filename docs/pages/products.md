# Product listing

- **Route/access:** `/products`, public.
- **Implementation:** [`Products.jsx`](../../src/pages/Products.jsx).
- **Data dependencies:** `getProducts()` and category data in [`productService.js`](../../src/service/productService.js); product cards use [`ProductCard.jsx`](../../src/components/ProductCard.jsx).
- **Behavior:** Loads and displays the catalog with search/category filtering and navigation to a product detail route. Product fields are normalized by the service layer from `Products`/`Categories` sheet records or static seed data.
- **Data contract:** Product identifiers map to `/products/:id`; active products are the public catalog. Keep product and category IDs stable when editing the sheet.
- **Troubleshooting:** Verify `Products` headers and active values. If live reads fail, check the configured endpoint and review the fallback behavior in [Google Sheets integration](../google-sheets-integration.md).
