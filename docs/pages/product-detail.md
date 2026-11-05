# Product detail

- **Route/access:** `/products/:id`, public.
- **Implementation:** [`ProductDetail.jsx`](../../src/pages/ProductDetail.jsx).
- **Data dependencies:** `getProductById(id)` from [`productService.js`](../../src/service/productService.js); shop/contact details and customer auth are used for actions exposed on the page.
- **Behavior:** Reads the route parameter, resolves the matching catalog product, and displays its bilingual name, price/pack, image, descriptive fields, and available contact/request actions.
- **Data contract:** The route ID must match the product's sheet/catalog ID. Descriptive content is sourced from `Products` and missing values may fall back to seeded data.
- **Troubleshooting:** Check the `Product_ID`/`ID` value and ensure the product is active. Image URL problems are independent of sheet connectivity.
