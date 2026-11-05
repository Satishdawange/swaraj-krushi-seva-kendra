# Contact page

- **Route/access:** `/contact`, public.
- **Implementation:** [`Contact.jsx`](../../src/pages/Contact.jsx).
- **Data dependencies:** `getShopInfo()` from [`shopService.js`](../../src/service/shopService.js), which reads shop settings and falls back to `shopProps`.
- **Behavior:** Displays shop address, phone/WhatsApp, opening details, and map/contact actions.
- **Configuration:** Change Settings keys for dynamic values; fallback defaults are in `src/config/shopProps.js`.
- **Troubleshooting:** If a value does not update, reload the page and verify the `Settings` tab key spelling/value.
