# Services page

- **Route/access:** `/services`, public.
- **Implementation:** [`Services.jsx`](../../src/pages/Services.jsx).
- **Data dependencies:** `fetchAllServices()` reads the `Services` tab with local/default service fallback; `fetchAllSheetSettings()` supplies feature/visibility settings; `getShopInfo()` supplies shared shop values.
- **Behavior:** Renders services marked active and visible on the portal, with service descriptions, benefits, card/slideshow images, and contact actions.
- **Data contract:** Service IDs, bilingual names, visibility flags, sort order, description, and image fields are edited in Admin → Google Sheets Integration → Services.
- **Troubleshooting:** Confirm `Services` headers and `Is_Active`/`Show_On_Portal`. Image links must be reachable by the browser. Feature flags are stored in the `Settings` tab.
