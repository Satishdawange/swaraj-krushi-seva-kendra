import React, {
  useEffect,
  useMemo,
  useState
} from 'react';



  import { Link } from 'react-router-dom';


// =========================================================
// ICONS
// =========================================================

import {
  Search,
  SlidersHorizontal,
  X
} from '../components/Icons';


// =========================================================
// COMPONENTS
// =========================================================

import ProductCard from '../components/ProductCard';


// =========================================================
// DATABASE / API FUNCTIONS
// =========================================================
//
// getProducts()   → Gets products from Supabase
// getCategories() → Gets categories from Supabase
//
// =========================================================

import {
  getProducts,
  getCategories
} from '../service/productService';


// =========================================================
// PAGE CSS
// =========================================================

import '../CSS/products.css';



export default function Products() {


  // =======================================================
  // 1. SEARCH TEXT
  // =======================================================
  //
  // q contains whatever the user types in the search box.
  //
  // Example:
  //
  // q = "mancozeb"
  //
  // or
  //
  // q = "मॅन्कोझेब"
  //
  // =======================================================

  const [q, setQ] = useState('');



  // =======================================================
  // 2. SELECTED CATEGORY
  // =======================================================
  //
  // This stores the category selected by the user.
  //
  // Initially:
  //
  // "सर्व उत्पादने"
  //
  // means show all products.
  //
  // =======================================================

  const [cat, setCat] = useState(
    'सर्व उत्पादने'
  );



  // =======================================================
  // 3. PRODUCTS STATE
  // =======================================================
  //
  // This will contain products received from Supabase.
  //
  // Initially it is an empty array because the API
  // has not returned anything yet.
  //
  // After API call:
  //
  // products = [
  //   { id: "p1", ... },
  //   { id: "p2", ... },
  //   ...
  // ]
  //
  // =======================================================

  const [products, setProducts] = useState([]);



  // =======================================================
  // 4. CATEGORIES STATE
  // =======================================================
  //
  // This will contain categories received from Supabase.
  //
  // Example:
  //
  // [
  //   "सर्व उत्पादने",
  //   "कीटकनाशके",
  //   "बुरशीनाशके",
  //   ...
  // ]
  //
  // IMPORTANT:
  //
  // "सर्व उत्पादने" is NOT a real database category.
  //
  // It is only a UI filter.
  //
  // Therefore, we will add it manually after receiving
  // the real categories from Supabase.
  //
  // =======================================================

  const [categories, setCategories] = useState([]);



  // =======================================================
  // 5. LOADING STATE
  // =======================================================
  //
  // While Supabase is fetching data:
  //
  // loading = true
  //
  // After data is received:
  //
  // loading = false
  //
  // This allows us to show:
  //
  // "उत्पादने लोड होत आहेत..."
  //
  // instead of showing an empty page.
  //
  // =======================================================

  const [loading, setLoading] = useState(true);



  // =======================================================
  // 6. ERROR STATE
  // =======================================================
  //
  // If something goes wrong while calling Supabase,
  // we store the error message here.
  //
  // Initially there is no error:
  //
  // error = null
  //
  // =======================================================

  const [error, setError] = useState(null);



  // =======================================================
  // 7. LOAD PRODUCTS + CATEGORIES
  // =======================================================
  //
  // useEffect() runs when the Products page loads.
  //
  // [] means:
  //
  // Run this only once when the component is mounted.
  //
  // =======================================================

  useEffect(() => {


    // -------------------------------------------------------
    // Create an async function.
    //
    // We do this because useEffect itself should not
    // directly be async.
    // -------------------------------------------------------

    async function loadData() {


      try {


        // ---------------------------------------------------
        // Start loading
        // ---------------------------------------------------

        setLoading(true);


        // ---------------------------------------------------
        // Clear any previous error
        // ---------------------------------------------------

        setError(null);



        // ---------------------------------------------------
        // Get products AND categories from Supabase
        //
        // Promise.all() runs both API calls together.
        //
        // Instead of:
        //
        // getProducts()
        // wait
        // getCategories()
        //
        // both run at the same time.
        //
        // ---------------------------------------------------

        const [
          productData,
          categoryData
        ] = await Promise.all([

          getProducts(),

          getCategories()

        ]);



        // ---------------------------------------------------
        // Store products in React state
        // ---------------------------------------------------

        setProducts(productData);



        // ---------------------------------------------------
        // Store categories in React state
        //
        // IMPORTANT:
        //
        // Our database currently contains:
        //
        // "सर्व उत्पादने"
        //
        // But this is a UI filter and should NOT be
        // duplicated.
        //
        // Therefore:
        //
        // 1. Remove "सर्व उत्पादने" from database result
        //
        // 2. Add "सर्व उत्पादने" manually at the beginning
        //
        // ---------------------------------------------------

        const databaseCategories = categoryData
          .map((category) => category.name)
          .filter(
            (categoryName) =>
              categoryName !== 'सर्व उत्पादने'
          );



        // ---------------------------------------------------
        // Final category list
        // ---------------------------------------------------
        //
        // Example:
        //
        // databaseCategories:
        //
        // [
        //   "कीटकनाशके",
        //   "बुरशीनाशके",
        //   "तणनाशके"
        // ]
        //
        // After this:
        //
        // [
        //   "सर्व उत्पादने",
        //   "कीटकनाशके",
        //   "बुरशीनाशके",
        //   "तणनाशके"
        // ]
        //
        // ---------------------------------------------------

        setCategories([

          'सर्व उत्पादने',

          ...databaseCategories

        ]);



      } catch (err) {


        // ---------------------------------------------------
        // Print technical error in browser console.
        //
        // Useful for debugging.
        // ---------------------------------------------------

        console.error(
          'Error loading products/categories:',
          err
        );


        // ---------------------------------------------------
        // Show user-friendly error message.
        // ---------------------------------------------------

        setError(
          'माहिती लोड करताना समस्या आली.'
        );


      } finally {


        // ---------------------------------------------------
        // Loading is finished whether successful or failed.
        // ---------------------------------------------------

        setLoading(false);

      }

    }



    // -------------------------------------------------------
    // Execute our API function
    // -------------------------------------------------------

    loadData();


  }, []);



  // =======================================================
  // 8. FILTER PRODUCTS
  // =======================================================
  //
  // useMemo() calculates the filtered product list.
  //
  // It runs again when:
  //
  // products changes
  // q changes
  // cat changes
  //
  // =======================================================

  const filtered = useMemo(() => {


    // -------------------------------------------------------
    // Convert search text to lowercase.
    //
    // trim() removes unnecessary spaces.
    //
    // Example:
    //
    // "  Mancozeb  "
    //
    // becomes:
    //
    // "mancozeb"
    //
    // -------------------------------------------------------

    const searchTerm = q
      .trim()
      .toLowerCase();



    // -------------------------------------------------------
    // Filter products
    // -------------------------------------------------------

    return products.filter((p) => {


      // =====================================================
      // CATEGORY FILTER
      // =====================================================
      //
      // If category is:
      //
      // "सर्व उत्पादने"
      //
      // we allow every product.
      //
      // Otherwise product category must match selected
      // category.
      //
      // =====================================================

      const matchesCategory =
        cat === 'सर्व उत्पादने' ||
        p.category === cat;



      // =====================================================
      // SEARCH TEXT
      // =====================================================
      //
      // We search in BOTH Marathi and English.
      //
      // Database fields:
      //
      // p.name
      // p.name_en
      // p.company
      // p.company_en
      // p.category
      // p.short
      // p.description
      //
      // =====================================================

      const searchText = [

        p.name,

        p.name_en,

        p.company,

        p.company_en,

        p.category,

        p.short,

        p.description

      ]

        // Remove empty/null values

        .filter(Boolean)

        // Combine everything into one string

        .join(' ')

        // Make search case-insensitive

        .toLowerCase();



      // =====================================================
      // SEARCH MATCH
      // =====================================================
      //
      // Example:
      //
      // searchTerm = "mancozeb"
      //
      // searchText contains:
      //
      // "मॅन्कोझेब 75% wp mancozeb 75% wp..."
      //
      // includes() returns true.
      //
      // =====================================================

      const matchesSearch =
        searchText.includes(searchTerm);



      // =====================================================
      // PRODUCT MUST MATCH BOTH FILTERS
      // =====================================================

      return (
        matchesCategory &&
        matchesSearch
      );

    });


  }, [
    products,
    q,
    cat
  ]);



  // =======================================================
  // 9. CLEAR FILTERS
  // =======================================================
  //
  // This function resets:
  //
  // Search
  // Category
  //
  // =======================================================

  const clearFilters = () => {

    setQ('');

    setCat('सर्व उत्पादने');

  };



  // =======================================================
  // 10. PAGE UI
  // =======================================================

  return (

    <section className="simple-page products-page">



      {/* =================================================
          PAGE HERO
      ================================================= */}

      <div className="page-hero">

        <span className="pill">
          🌿 उत्पादन संग्रह
        </span>

        <h1>
          शेतीसाठी उत्पादने
        </h1>

        <p>
          उत्पादनाचे नाव, कंपनी किंवा श्रेणीने शोधा.
        </p>

      </div>



      {/* =================================================
          SEARCH SECTION
      ================================================= */}

      <div className="products-search-section">


        <div className="product-search">

          <Search size={20} />


          <input

            type="text"

            value={q}

            onChange={(e) =>
              setQ(e.target.value)
            }

            placeholder="उत्पादन किंवा कंपनी शोधा..."

            aria-label="उत्पादन किंवा कंपनी शोधा"

          />


          {/* ---------------------------------------------
              CLEAR SEARCH BUTTON
          --------------------------------------------- */}

          {q && (

            <button

              type="button"

              className="search-clear"

              onClick={() =>
                setQ('')
              }

              aria-label="शोध साफ करा"

            >

              <X size={18} />

            </button>

          )}

        </div>



        {/* ---------------------------------------------
            SEARCH HINT
        --------------------------------------------- */}

        <p className="search-hint">

          मराठी किंवा English मध्ये उत्पादनाचे नाव
          किंवा कंपनीचे नाव शोधा

        </p>

      </div>



      {/* =================================================
          CATEGORY FILTER
      ================================================= */}

      <div className="category-section">


        {/* ---------------------------------------------
            CATEGORY TITLE
        --------------------------------------------- */}

        <div className="category-title">

          <SlidersHorizontal size={18} />

          <span>
            श्रेणी निवडा
          </span>

        </div>



        {/* ---------------------------------------------
            CATEGORY BUTTONS
        --------------------------------------------- */}

        <div className="category-filter">

          {categories.map((c) => (

            <button

              key={c}

              type="button"

              className={
                cat === c
                  ? 'category-btn active'
                  : 'category-btn'
              }

              onClick={() =>
                setCat(c)
              }

            >

              {c}

            </button>

          ))}

        </div>

      </div>



      {/* =================================================
          RESULT HEADER
      ================================================= */}

      <div className="products-result-header">


        <div className="products-result-count">

          <strong>
            {filtered.length}
          </strong>

          <span>
            उत्पादने सापडली
          </span>

        </div>

<Link
  to="/product-request"
  className="primary-btn"
>
  🌱 नवीन उत्पादनाची मागणी करा
</Link>


        {/* ---------------------------------------------
            CLEAR ALL FILTERS
        --------------------------------------------- */}

        {(q || cat !== 'सर्व उत्पादने') && (

          <button

            type="button"

            className="clear-filters-btn"

            onClick={clearFilters}

          >

            <X size={16} />

            फिल्टर साफ करा

          </button>

        )}

      </div>



      {/* =================================================
          LOADING STATE
      ================================================= */}

      {loading && (

        <div className="empty-state">

          <div className="empty-icon">
            🌱
          </div>

          <h3>
            उत्पादने लोड होत आहेत...
          </h3>

          <p>
            कृपया थोडा वेळ प्रतीक्षा करा.
          </p>

        </div>

      )}



      {/* =================================================
          ERROR STATE
      ================================================= */}

      {!loading && error && (

        <div className="empty-state">

          <div className="empty-icon">
            ⚠️
          </div>

          <h3>
            काहीतरी चूक झाली
          </h3>

          <p>
            {error}
          </p>


          <button

            type="button"

            className="secondary-btn"

            onClick={() =>
              window.location.reload()
            }

          >

            पुन्हा प्रयत्न करा

          </button>

        </div>

      )}



      {/* =================================================
          PRODUCT GRID
          ///
      // Only show products when:
      //
      // loading = false
      // error = null
      // products exist
      //
      // =================================================
      ================================================= */}
      
      

      {!loading &&
        !error &&
        filtered.length > 0 && (

          <div className="product-grid">

            {filtered.map((p) => (

              <ProductCard

                key={p.id}

                product={p}

              />

            ))}

          </div>

        )}



      {/* =================================================
          NO PRODUCTS FOUND
      ================================================= */}

      {!loading &&
        !error &&
        filtered.length === 0 && (

          <div className="empty-state">


            <div className="empty-icon">
              🌱
            </div>


            <h3>
              उत्पादन सापडले नाही
            </h3>


            <p>
              शोध शब्द किंवा श्रेणी बदलून
              पुन्हा प्रयत्न करा.
            </p>



            {/* -----------------------------------------
                Show reset button only if user has
                actually applied a filter/search.
            ----------------------------------------- */}

            {(q || cat !== 'सर्व उत्पादने') && (

              <button

                type="button"

                className="secondary-btn"

                onClick={clearFilters}

              >

                सर्व उत्पादने पहा

              </button>

            )}

          </div>

        )}

    </section>

  );

}