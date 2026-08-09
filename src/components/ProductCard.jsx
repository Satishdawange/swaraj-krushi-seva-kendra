
import React from 'react';
import "../CSS/productCard.css";

import { Link } from 'react-router-dom';

import {
  ArrowUpRight,
  MessageCircle
} from '../components/Icons';


export default function ProductCard({ product }) {

  return (
    <article className="product-card">


      {/* Product Image */}
      <div className="product-card-image">

        <img
          src={product.image}
          alt={product.name}
        />

      </div>


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
          <strong className="product-price">
            ₹{product.price.toLocaleString('en-IN')}
          </strong>


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

