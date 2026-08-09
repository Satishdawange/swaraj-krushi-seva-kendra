
import React from 'react';

import {
  Link,
  useParams
} from 'react-router-dom';

import {
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
  Package,
  Sprout
} from '../components/Icons';

import { products } from '../data/products';

import ShopProp from '../config/shopProps';


export default function ProductDetail() {

  const { id } = useParams();


  // Find selected product
  const p = products.find(
    (x) => String(x.id) === String(id)
  );


  // Product not found
  if (!p) {
    return (
      <section className="simple-page">

        <div className="page-hero">

          <span className="pill">
            🌱 उत्पादन
          </span>

          <h1>
            उत्पादन सापडले नाही
          </h1>

          <p>
            आपण शोधत असलेले उत्पादन उपलब्ध नाही.
          </p>

          <Link
            to="/products"
            className="primary-btn"
          >
            <ArrowLeft size={18} />
            उत्पादनांकडे परत जा
          </Link>

        </div>

      </section>
    );
  }


  // WhatsApp message
  const whatsappMessage =
    `नमस्कार, मला हे उत्पादन खरेदी करायचे आहे: ${p.name}`;


  const whatsappLink =
    `https://wa.me/${ShopProp.whatsapp}?text=${encodeURIComponent(
      whatsappMessage
    )}`;


  return (
    <section className="simple-page product-detail-page">


      {/* Back Link */}
      <Link
        to="/products"
        className="back-link"
      >
        <ArrowLeft size={17} />
        सर्व उत्पादने
      </Link>


      <div className="product-detail">


        {/* Product Image */}
        <div className="product-detail-image">

          <img
            src={p.image}
            alt={p.name}
          />

        </div>


        {/* Product Information */}
        <div className="product-detail-content">


          {/* Badge */}
          {p.badge && (
            <span className="pill">
              {p.badge}
            </span>
          )}


          {/* Company and Category */}
          <span className="product-meta">
            {p.company} • {p.category}
          </span>


          {/* Product Name */}
          <h1>
            {p.name}
          </h1>


          {/* Short Description */}
          <p className="product-short">
            {p.short}
          </p>


          {/* Price */}
          <div className="product-price">
            ₹{p.price.toLocaleString('en-IN')}

            <span>
              • {p.pack}
            </span>
          </div>


          {/* Description */}
          <div className="product-description">

            <h3>
              उत्पादनाची माहिती
            </h3>

            <p>
              {p.description}
            </p>

          </div>


          {/* Product Information Grid */}
          <div className="product-info-grid">


            {/* Pack */}
            <div className="product-info-item">

              <Package />

              <div>

                <b>
                  पॅक
                </b>

                <span>
                  {p.pack}
                </span>

              </div>

            </div>


            {/* Crops */}
            <div className="product-info-item">

              <Sprout />

              <div>

                <b>
                  पिके
                </b>

                <span>
                  {p.crops}
                </span>

              </div>

            </div>


            {/* Usage */}
            <div className="product-info-item">

              <CheckCircle2 />

              <div>

                <b>
                  वापराची माहिती
                </b>

                <span>
                  {p.usage}
                </span>

              </div>

            </div>

          </div>


          {/* WhatsApp Buy Button */}
          <a
            className="whatsapp-buy"
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={20} />

            WhatsApp वर खरेदीची चौकशी करा
          </a>


          {/* WhatsApp Information */}
          <p className="whatsapp-note">
            WhatsApp संदेशात उत्पादनाचे नाव आपोआप येईल.
          </p>


          {/* Safety Note */}
          <div className="product-safety-note">

            ⚠️ कृषी रसायनांचा वापर नेहमी उत्पादनाच्या
            लेबलवरील सूचनांनुसार व तज्ज्ञांच्या मार्गदर्शनाखाली करा.

          </div>

        </div>

      </div>

    </section>
  );
}

