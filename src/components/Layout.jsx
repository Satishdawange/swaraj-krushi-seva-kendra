import React, {
  useEffect,
  useState
} from 'react';

import {
  Link,
  NavLink
} from 'react-router-dom';

import LogoImg from '../images/sksklogo.png';

import {
  Sprout,
  Menu,
  X,
  Search,
  Phone,
  MapPin,
  MessageCircle
} from './Icons';

import {
  getShopSettings
} from '../service/shopService';

import { useAuth } from '../context/AuthContext';


export default function Layout({ children }) {


  // =====================================================
  // MOBILE MENU STATE
  // =====================================================
  //
  // open = true
  //     → mobile menu is open
  //
  // open = false
  //     → mobile menu is closed
  //
  // =====================================================

  const [open, setOpen] = useState(false);
  const { isAdmin, signOut } = useAuth();



  // =====================================================
  // SHOP INFORMATION STATE
  // =====================================================
  //
  // Initially null because the information has not yet
  // arrived from Supabase.
  //
  // After API response:
  //
  // shop = {
  //   name: "...",
  //   full_name: "...",
  //   phone: "...",
  //   whatsapp: "...",
  //   address: "...",
  //   pincode: "..."
  // }
  //
  // =====================================================

  const [shop, setShop] = useState(null);



  // =====================================================
  // LOAD SHOP INFORMATION FROM SUPABASE
  // =====================================================

  useEffect(() => {


    async function loadShop() {


      try {


        // -------------------------------------------------
        // Call Supabase
        // -------------------------------------------------

        const data = await getShopSettings();


        // -------------------------------------------------
        // Store returned data in React state
        // -------------------------------------------------

        setShop(data);


      } catch (error) {


        // -------------------------------------------------
        // Show technical error in browser console
        // -------------------------------------------------

        console.error(
          'SHOP ERROR:',
          error
        );

      }

    }


    // -----------------------------------------------------
    // Execute function
    // -----------------------------------------------------

    loadShop();


  }, []);



  // =====================================================
  // NAVIGATION LINKS
  // =====================================================

  const baseLinks = [
    ['/', 'मुख्यपृष्ठ'],
    ['/products', 'उत्पादने'],
    ['/product-request', 'उत्पादन मागणी'],
    ['/about', 'आमच्याबद्दल'],
    ['/services', 'सेवा'],
    ['/contact', 'संपर्क']
  ];

  const adminLinks = isAdmin
    ? [
        ['/admin/billing', '🧾 बिल तयार करा'],
        ['/admin/bills', '📋 सर्व बिले']
      ]
    : [];

  const links = [...baseLinks, ...adminLinks];



  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="app-shell">


      {/* =================================================
          TOP STRIP
      ================================================= */}

      <div className="top-strip">

        <span>
          🌱 शेतकरी हित प्रथम • दर्जेदार कृषी उत्पादने • विश्वासाची सेवा
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span className="top-hide">
            📍 आपल्या सेवेत सदैव
          </span>

          {isAdmin ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#b9dc68', fontSize: '11px' }}>
              👤 ॲडमिन
              <button
                onClick={signOut}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                लॉगआउट
              </button>
            </span>
          ) : (
            <Link
              to="/admin/login"
              style={{
                color: '#b9dc68',
                fontSize: '11px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🔐 Admin
            </Link>
          )}
        </div>

      </div>



      {/* =================================================
          NAVBAR
      ================================================= */}

      <header className="navbar">


        {/* =================================================
            LOGO + SHOP NAME
        ================================================= */}

        <Link
          to="/"
          className="brand"
          onClick={() => setOpen(false)}
        >

          <img
            src={LogoImg}
            alt="स्वराज कृषी सेवा केंद्र"
            className="shop-logo"
            width="70"
            height="50"
          />


          <span className="brand-text">

            <strong>
              स्वराज
            </strong>

            <small>
              कृषी सेवा केंद्र
            </small>

          </span>

        </Link>



        {/* =================================================
            MOBILE MENU BUTTON
        ================================================= */}

        <button
          className="mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-label={
            open
              ? 'मेनू बंद करा'
              : 'मेनू उघडा'
          }
        >

          {open
            ? <X />
            : <Menu />
          }

        </button>



        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav
          className={
            open
              ? 'nav-links open'
              : 'nav-links'
          }
        >


          {links.map(
            ([to, label]) => (

              <NavLink
                key={to}
                to={to}
                onClick={() =>
                  setOpen(false)
                }
              >

                {label}

              </NavLink>

            )
          )}



          {/* =================================================
              PRODUCT SEARCH BUTTON
          ================================================= */}

          <Link
            className="nav-cta"
            to="/products"
            onClick={() =>
              setOpen(false)
            }
          >

            <Search size={17} />

            उत्पादन शोधा

          </Link>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                margin: '6px 0 0'
              }}
            >
              🚪 बाहेर पडा (Logout)
            </button>
          )}

        </nav>

      </header>



      {/* =================================================
          MAIN PAGE CONTENT
      ================================================= */}

      <main>

        {children}

      </main>



      {/* =================================================
          FLOATING WHATSAPP BUTTON
      ================================================= */
      //
      // shop is initially null.
      //
      // Therefore we only display the WhatsApp button
      // after Supabase returns shop information.
      //
      // =================================================
      };

      {shop && (

        <a
          className="whatsapp-float"
          href={`https://wa.me/${shop.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
        >

          <MessageCircle size={25} />

          <span>
            WhatsApp
          </span>

        </a>

      )}



      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="footer">


        <div className="footer-grid">


          {/* =================================================
              SHOP INFORMATION
          ================================================= */}

          <div>


            <div className="brand footer-brand">


              <span className="brand-icon">

                <Sprout size={25} />

              </span>


              <span>

                <strong>
                  स्वराज
                </strong>

                <small>
                  कृषी सेवा केंद्र
                </small>

              </span>


            </div>


            <p>

              शेतकऱ्यांच्या गरजांना समजून घेणारी,
              विश्वासू आणि आधुनिक कृषी सेवा.

            </p>


          </div>



          {/* =================================================
              QUICK LINKS
          ================================================= */}

          <div>

            <h4>
              जलद दुवे
            </h4>


            <Link to="/products">
              उत्पादने
            </Link>


            <Link to="/services">
              सेवा
            </Link>


            <Link to="/about">
              आमच्याबद्दल
            </Link>


          </div>



          {/* =================================================
              CONTACT INFORMATION
          ================================================= */}

          <div>

            <h4>
              संपर्क
            </h4>


            {/* ---------------------------------------------
                ADDRESS
            --------------------------------------------- */}

            {shop && (

              <span>

                <MapPin size={16} />

                {shop.address}

                {shop.pincode &&
                  `, ${shop.pincode}`
                }

              </span>

            )}



            {/* ---------------------------------------------
                PHONE
            --------------------------------------------- */}

            {shop && (

              <a
                href={`tel:${shop.phone}`}
              >

                <Phone size={16} />

                {shop.phone}

              </a>

            )}

          </div>


        </div>



        {/* =================================================
            COPYRIGHT
        ================================================= */}

        <div className="copyright">

          © {new Date().getFullYear()}{' '}

          {shop
            ? shop.full_name
            : 'स्वराज कृषी सेवा केंद्र'
          }

          . सर्व हक्क राखीव.

        </div>


      </footer>


    </div>

  );

}