# About page

- **Route/access:** `/about`, public.
- **Implementation:** [`About.jsx`](../../src/pages/About.jsx).
- **Data flow:** Primarily static page content; global header/footer/navigation are supplied by `AppShell`.
- **Behavior:** Displays the shop's background, service values, and informational content. It does not own Google Sheets reads or writes.
- **Maintenance:** Update copy and presentation in `About.jsx`; shared shop contact values should be updated through the relevant shop settings rather than duplicated here when practical.
