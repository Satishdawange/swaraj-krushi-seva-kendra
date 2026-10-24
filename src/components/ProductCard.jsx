
import React from 'react';
import "../CSS/productCard.css";

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import {
  ArrowUpRight,
  MessageCircle
} from '../components/Icons';


export default function ProductCard({ product }) {
  const { isAdmin } = useAuth();

  return (
    <article className="product-card">


      {/* Product Image */}
      <Link to={`/products/${product.id}`} className="product-card-image" aria-label={`${product.name} उत्पादन माहिती`}>
        <img
          src={product.image}
          alt={product.name}
          onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/sksk-icon-512.png'; }}
        />
      </Link>


      {/* Product Information */}
      <div className="product-card-content">


        {/* Badge */}
        {product.badge && (
          <span className="product-badge">
            {product.badge}
          </span> 
        )}


        {/* Category */}
        <span className="product-category">
          {product.category}
        </span>


        {/* Product Name */}
        <h3>
          {product.name}
        </h3>


        {/* Short Description */}
        <p>
          {product.short}
        </p>


        {/* Bottom Section */}
        <div className="product-card-bottom">


          {/* Price */}
          {isAdmin && <strong className="product-price">₹{product.price.toLocaleString('en-IN')}</strong>}


          {/* Product Details */}
          <Link
            to={`/products/${product.id}`}
            className="icon-btn"
            aria-label="उत्पादन तपशील"
          >
            <ArrowUpRight size={18} />
          </Link>

        </div>


        {/* WhatsApp / Details Button */}
        <Link
          to={`/products/${product.id}`}
          className="wa-mini"
        >
          <MessageCircle size={17} />

          तपशील व WhatsApp
        </Link>


      </div>

    </article>
  );
}

