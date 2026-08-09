
import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
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

import ShopProp from '../config/shopProps';

export default function Layout({ children }) {

  const [open, setOpen] = useState(false);

  const links = [
    ['/', 'मुख्यपृष्ठ'],
    ['/products', 'उत्पादने'],
    ['/about', 'आमच्याबद्दल'],
    ['/services', 'सेवा'],
    ['/contact', 'संपर्क']
  ];

  return (
    <div className="app-shell">

      <div className="top-strip">
        <span>
          🌱 शेतकरी हित प्रथम • दर्जेदार कृषी उत्पादने • विश्वासाची सेवा
        </span>

        <span className="top-hide">
          📍 आपल्या सेवेत सदैव
        </span>
      </div>


      <header className="navbar">

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
    <strong>स्वराज</strong>
    <small>कृषी सेवा केंद्र</small>
  </span>
</Link>


        <button
          className="mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'मेनू बंद करा' : 'मेनू उघडा'}
        >
          {open ? <X /> : <Menu />}
        </button>


        <nav className={open ? 'nav-links open' : 'nav-links'}>

          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}

          <Link
            className="nav-cta"
            to="/products"
            onClick={() => setOpen(false)}
          >
            <Search size={17} />
            उत्पादन शोधा
          </Link>

        </nav>

      </header>


      <main>
        {children}
      </main>


      {/* WhatsApp */}
      <a
        className="whatsapp-float"
        href={`https://wa.me/${ShopProp.whatsapp}`}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
      >
        <MessageCircle size={25} />
        <span>WhatsApp</span>
      </a>


      <footer className="footer">

        <div className="footer-grid">

          {/* Shop Information */}
          <div>

            <div className="brand footer-brand">

              <span className="brand-icon">
                <Sprout size={25} />
              </span>

              <span>
                <strong>स्वराज</strong>
                <small>कृषी सेवा केंद्र</small>
              </span>

            </div>

            <p>
              शेतकऱ्यांच्या गरजांना समजून घेणारी,
              विश्वासू आणि आधुनिक कृषी सेवा.
            </p>

          </div>


          {/* Quick Links */}
          <div>

            <h4>Quick Links</h4>

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


          {/* Contact */}
          <div>

            <h4>संपर्क</h4>

            <span>
              <MapPin size={16} />
              {ShopProp.address}, {ShopProp.pincode}
            </span>

            <a href={`tel:${ShopProp.phone}`}>
              <Phone size={16} />
              {ShopProp.phone}
            </a>

          </div>

        </div>


        <div className="copyright">
          © {new Date().getFullYear()} {ShopProp.fullName}. सर्व हक्क राखीव.
        </div>

      </footer>

    </div>
  );
}
