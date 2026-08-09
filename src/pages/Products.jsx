
import React, {
  useMemo,
  useState
} from 'react';

import {
  Search,
  SlidersHorizontal,
  X
} from '../components/Icons';

import {
  categories,
  products
} from '../data/products';

import ProductCard from '../components/ProductCard';

import '../CSS/products.css';


export default function Products() {

  // =========================
  // Search Text
  // =========================

  const [q, setQ] = useState('');


  // =========================
  // Selected Category
  // =========================

  const [cat, setCat] = useState('सर्व उत्पादने');


  // =========================
  // Filter Products
  // =========================

  const filtered = useMemo(() => {

    const searchTerm = q
      .trim()
      .toLowerCase();


    return products.filter((p) => {


      // Category filter
      const matchesCategory =
        cat === 'सर्व उत्पादने' ||
        p.category === cat;


      // Search in Marathi + English
      const searchText = [
        p.name,
        p.nameEn,
        p.company,
        p.companyEn,
        p.category,
        p.short
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();


      // Search filter
      const matchesSearch =
        searchText.includes(searchTerm);


      return (
        matchesCategory &&
        matchesSearch
      );

    });

  }, [q, cat]);


  // =========================
  // Clear All Filters
  // =========================

  const clearFilters = () => {
    setQ('');
    setCat('सर्व उत्पादने');
  };


  return (
    <section className="simple-page products-page">


      {/* =========================
          PAGE HERO
      ========================== */}

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


      {/* =========================
          SEARCH SECTION
      ========================== */}

      <div className="products-search-section">

        <div className="product-search">

          <Search size={20} />

          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="उत्पादन किंवा कंपनी शोधा..."
            aria-label="उत्पादन किंवा कंपनी शोधा"
          />


          {/* Clear Search */}
          {q && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setQ('')}
              aria-label="शोध साफ करा"
            >
              <X size={18} />
            </button>
          )}

        </div>


        {/* Search Hint */}
        <p className="search-hint">
          मराठी किंवा English मध्ये उत्पादनाचे नाव किंवा कंपनीचे नाव शोधा
        </p>

      </div>


      {/* =========================
          CATEGORY FILTER
      ========================== */}

      <div className="category-section">

        <div className="category-title">

          <SlidersHorizontal size={18} />

          <span>
            श्रेणी निवडा
          </span>

        </div>


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
              onClick={() => setCat(c)}
            >
              {c}
            </button>

          ))}

        </div>

      </div>


      {/* =========================
          RESULT HEADER
      ========================== */}

      <div className="products-result-header">

        <div className="products-result-count">

          <strong>
            {filtered.length}
          </strong>

          <span>
            उत्पादने सापडली
          </span>

        </div>


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


      {/* =========================
          PRODUCT GRID
      ========================== */}

      {filtered.length > 0 ? (

        <div className="product-grid">

          {filtered.map((p) => (

            <ProductCard
              key={p.id}
              product={p}
            />

          ))}

        </div>

      ) : (

        /* =========================
           NO PRODUCTS
        ========================== */

        <div className="empty-state">

          <div className="empty-icon">
            🌱
          </div>

          <h3>
            उत्पादन सापडले नाही
          </h3>

          <p>
            शोध शब्द किंवा श्रेणी बदलून पुन्हा प्रयत्न करा.
          </p>


          <button
            type="button"
            className="secondary-btn"
            onClick={clearFilters}
          >
            सर्व उत्पादने पहा
          </button>

        </div>

      )}

    </section>
  );
}
