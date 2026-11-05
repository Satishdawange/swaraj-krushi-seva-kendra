# Home page

- **Route/access:** `/`, public.
- **Implementation:** [`Home.jsx`](../../src/pages/Home.jsx); composed inside [`AppShell.jsx`](../../src/components/AppShell.jsx).
- **Data dependencies:** `getProducts()` for featured product content and `getShopInfo()` for configurable shop details; `ProductCard` and `AiAgriAdvisor` provide reusable product/AI sections.
- **Behavior:** Presents the shop landing page, navigation/marketing sections, featured catalog content, and links to product, service, contact, and request routes. Product and shop data use their service-layer fallbacks when remote values are absent.
- **Related configuration:** Product catalog data is managed by `productService`; shop display values are read from Google Sheets `Settings` with static defaults in `shopProps`.
- **Troubleshooting:** If products or shop information are stale, verify the `Products`/`Settings` tabs and use the Google Sheets integration docs. AI advisor setup is described in [configuration](../configuration.md).
