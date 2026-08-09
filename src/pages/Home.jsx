
import React from 'react';

import { Link } from 'react-router-dom';

import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  ShieldCheck,
  Truck,
  MessageCircle,
  Phone,
  MapPin,
  Search
} from '../components/Icons';

import { products } from '../data/products';

import ProductCard from '../components/ProductCard';

import ShopProp from '../config/shopProps';


export default function Home() {

  return (
    <>


      {/* =========================
          HERO SECTION
      ========================== */}

      <section className="hero">

        <div className="hero-glow one"></div>

        <div className="hero-glow two"></div>


        <div className="hero-content">

          <span className="pill">
            🌾 शेतकऱ्यांचा विश्वास • स्थानिक सेवा
          </span>


          <h1>
            शेतीसाठी योग्य निवड,
            <br />
            <em>
              उत्पादनापासून मार्गदर्शनापर्यंत.
            </em>
          </h1>


          <p>
            स्वराज कृषी सेवा केंद्रमध्ये कीटकनाशके,
            बुरशीनाशके, तणनाशके, जैविक उत्पादने आणि खते —
            आपल्या पिकांच्या गरजेनुसार.
          </p>


          <div className="hero-actions">

            <Link
              to="/products"
              className="primary-btn"
            >
              उत्पादने पहा
              <ArrowRight size={18} />
            </Link>


            <Link
              to="/contact"
              className="secondary-btn"
            >
              आमच्याशी बोला
              <MessageCircle size={18} />
            </Link>

          </div>


          <div className="trust-row">

            <span>
              <CheckCircle2 />
              दर्जेदार उत्पादने
            </span>

            <span>
              <CheckCircle2 />
              योग्य माहिती
            </span>

            <span>
              <CheckCircle2 />
              WhatsApp वर चौकशी
            </span>

          </div>

        </div>


        {/* Hero Image */}
        <div className="hero-visual">

          <div className="hero-card main">

            <img
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1100&q=85"
              alt="हिरवेगार शेत"
            />


            <div className="image-caption">

              <span>
                🌱
              </span>

              <div>

                <b>
                  आपल्या शेतीसोबत
                </b>

                <small>
                  प्रत्येक हंगामात
                </small>

              </div>

            </div>

          </div>


          <div className="floating-stat">

            <b>
              100%
            </b>

            <span>
              शेतकरी-केंद्रित सेवा
            </span>

          </div>

        </div>

      </section>


      {/* =========================
          FEATURE STRIP
      ========================== */}

      <section className="feature-strip">


        <div>

          <Leaf />

          <b>
            पिकानुसार पर्याय
          </b>

          <span>
            गरजेनुसार उत्पादन शोधा
          </span>

        </div>


        <div>

          <ShieldCheck />

          <b>
            जबाबदार वापर
          </b>

          <span>
            लेबल व तज्ज्ञ मार्गदर्शन
          </span>

        </div>


        <div>

          <Truck />

          <b>
            सुलभ उपलब्धता
          </b>

          <span>
            दुकानातून थेट खरेदी
          </span>

        </div>

      </section>


      {/* =========================
          POPULAR PRODUCTS
      ========================== */}

      <section className="section">

        <div className="section-head">

          <div>

            <span className="section-kicker">
              आमची निवड
            </span>

            <h2>
              लोकप्रिय उत्पादने
            </h2>

            <p>
              दुकानातील काही प्रमुख उत्पादने.
              पूर्ण यादी पाहण्यासाठी उत्पादन विभागात जा.
            </p>

          </div>


          <Link
            to="/products"
            className="text-link"
          >
            सर्व उत्पादने
            <ArrowRight size={17} />
          </Link>

        </div>


        <div className="product-grid">

          {products
            .slice(0, 3)
            .map((p) => (
              <ProductCard
                key={p.id}
                product={p}
              />
            ))}

        </div>

      </section>


      {/* =========================
          WHY SWARAJ SECTION
      ========================== */}

      <section className="split-section">


        <div className="split-image">

          <img
            src="https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?auto=format&fit=crop&w=1200&q=85"
            alt="शेतकरी आणि पीक"
          />

        </div>


        <div className="split-copy">

          <span className="section-kicker">
            का स्वराज?
          </span>


          <h2>
            उत्पादन विकणेच नाही,
            <br />
            <em>
              योग्य निर्णय घेण्यास मदत.
            </em>
          </h2>


          <p>
            प्रत्येक शेताची आणि प्रत्येक पिकाची गरज वेगळी असते.
            म्हणून उत्पादनासोबत वापराची माहिती, पिकानुसार पर्याय
            आणि आवश्यक ते मार्गदर्शन देणे हा आमचा प्रयत्न.
          </p>


          <ul>

            <li>
              <CheckCircle2 />
              विविध कृषी उत्पादनांची निवड
            </li>

            <li>
              <CheckCircle2 />
              उत्पादनाची स्पष्ट माहिती
            </li>

            <li>
              <CheckCircle2 />
              WhatsApp वर जलद चौकशी
            </li>

          </ul>


          <Link
            to="/about"
            className="primary-btn"
          >
            आमच्याबद्दल
            <ArrowRight size={18} />
          </Link>

        </div>

      </section>


      {/* =========================
          PRODUCT SEARCH CTA
      ========================== */}

      <section className="cta">

        <div>

          <span className="section-kicker">
            शेतकरी मित्रांसाठी
          </span>

          <h2>
            उत्पादन शोधायचे आहे?
          </h2>

          <p>
            नाव, कंपनी किंवा श्रेणीने शोधा आणि
            आवडलेल्या उत्पादनाची WhatsApp वर
            थेट चौकशी करा.
          </p>

        </div>


        <Link
          to="/products"
          className="white-btn"
        >
          <Search size={18} />
          उत्पादन शोधा
        </Link>

      </section>


      {/* =========================
          CONTACT PREVIEW
      ========================== */}

      <section className="contact-preview">


        <div>

          <span className="section-kicker">
            भेट द्या
          </span>


          <h2>
            आपल्या शेतीसाठी
            <br />
            आपण इथेच आहोत.
          </h2>


          <p>
            दुकानाची वेळ, पत्ता आणि संपर्क माहिती
            पाहण्यासाठी संपर्क पृष्ठाला भेट द्या.
          </p>


          <Link
            to="/contact"
            className="text-link"
          >
            संपर्क माहिती
            <ArrowRight size={17} />
          </Link>

        </div>


        <div className="contact-box">


          {/* Address */}
          <MapPin />

          <div>

            <b>
              {ShopProp.fullName}
            </b>

            <span>
              {ShopProp.address}
            </span>

            <span>
              {ShopProp.pincode}
            </span>

          </div>


          {/* Phone */}
          <Phone />

          <div>

            <b>
              {ShopProp.phone}
            </b>

            <span>
              सोम–शनि • सकाळी 8 ते संध्याकाळी 10
            </span>

          </div>

        </div>

      </section>


    </>
  );
}

