
import React, { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  ShieldCheck,
  MapPin,
  MessageCircle,
  Phone,
  Search
} from '../components/Icons';

import { getProducts } from '../service/productService';

import ProductCard from '../components/ProductCard';

import ShopProp from '../config/shopProps';
import { getShopInfo } from '../service/shopService';

import AiAgriAdvisor from '../components/AiAgriAdvisor';


export default function Home() {
  const [products, setProducts] = useState([]);
  const shop = getShopInfo();

  useEffect(() => {
    let active = true;
    getProducts().then((items) => { if (active) setProducts(items); }).catch(() => {});
    return () => { active = false; };
  }, []);

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
            {shop.showAiAdvisor ? '🌾 AI कृषी मित्र • थेट मोफत शेती सल्लागार' : `🌾 ${shop.fullName || 'स्वराज कृषी सेवा केंद्र'}`}
          </span>


          <h1>
            शेतीसाठी योग्य निवड,
            <br />
            <em>
              उत्पादनापासून मार्गदर्शनापर्यंत.
            </em>
          </h1>


          <p>
            {shop.showAiAdvisor
              ? 'पिकांवरील रोग, किडीचा प्रादुर्भाव किंवा खतांबद्दल थेट प्रश्न विचारा — आमचा AI कृषी मित्र तुम्हाला पिकांचे नाव, डोस व स्वराज कृषी सेवा केंद्रातील योग्य औषधांची माहिती देईल.'
              : 'शेतकरी बांधवांसाठी अस्सल कंपनीची खते, कीटकनाशके, बुरशीनाशके, विद्राव्य खते व आधुनिक कृषी मार्गदर्शन. आपल्या सर्व शेतीविषयक गरजांसाठी एकच विश्वासू केंद्र.'}
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


        {/* Interactive AI Krushi Mitra Window or Shop Highlights */}
        <div className="hero-visual" style={{ minHeight: 'auto' }}>

          {shop.showAiAdvisor ? (
            <AiAgriAdvisor />
          ) : (
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '30px',
              border: '1.5px solid #c2dec7',
              boxShadow: '0 8px 30px rgba(23,107,58,0.08)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌱</div>
              <h3 style={{ margin: '0 0 10px', color: '#176b3a', fontSize: '20px' }}>
                {shop.fullName || 'स्वराज कृषी सेवा केंद्र'}
              </h3>
              <p style={{ margin: '0 0 16px', color: '#556b5a', fontSize: '14px', lineHeight: '1.6' }}>
                {shop.address || 'मु. पो. कानमंडाळे, ता. चांदवड, जि. नाशिक'}
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href={`tel:${shop.phone || ShopProp.phone}`}
                  className="primary-btn"
                  style={{ padding: '10px 18px', fontSize: '13px' }}
                >
                  📞 थेट कॉल करा
                </a>
                <a
                  href={`https://wa.me/${shop.whatsapp || ShopProp.whatsapp}`}
                  className="secondary-btn"
                  style={{ padding: '10px 18px', fontSize: '13px', background: '#eaf5eb', color: '#176b3a' }}
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>
          )}

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

          <MapPin />

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
