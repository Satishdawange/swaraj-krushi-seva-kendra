import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import LogoImg from '../images/sksklogo.png';
import {
  Menu,
  X,
  Search,
  Phone,
  MapPin,
  MessageCircle
} from './Icons';
import { getShopSettings } from '../service/shopService';
import { useAuth } from '../context/AuthContext';
import ShopProp from '../config/shopProps';

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { user, role, isAdmin, isStaff, isCustomer, isAuthenticated, signOut } = useAuth();
  const [shop, setShop] = useState(null);
  const location = useLocation();

  useEffect(() => {
    async function loadShop() {
      try {
        const data = await getShopSettings();
        setShop(data);
      } catch (error) {
        console.warn('SHOP ERROR:', error);
      }
    }
    loadShop();
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Dynamic Navigation Links based on logged-in Persona
  const baseLinks = [
    ['/', 'मुख्यपृष्ठ'],
    ['/products', 'उत्पादने'],
    ['/services', 'सेवा'],
    ['/about', 'आमच्याबद्दल'],
    ['/contact', 'संपर्क']
  ];

  let personaLinks = [];
  if (isAdmin) {
    personaLinks = [
      ['/admin/dashboard', '📊 डॅशबोर्ड'],
      ['/admin/billing', '🧾 बिल बनवा'],
      ['/admin/bills', '📋 सर्व बिले'],
      ['/admin/inventory', '📦 स्टॉक / इन्व्हेंटरी'],
      ['/admin/sheets', '📑 गुगल शीट्स']
    ];
  } else if (isStaff) {
    personaLinks = [
      ['/admin/billing', '🧾 बिल बनवा'],
      ['/admin/bills', '📋 बिले इतिहास'],
      ['/admin/inventory', '📦 स्टॉक पाहा']
    ];
  } else if (isCustomer) {
    personaLinks = [
      ['/customer/portal', '🌾 माझे खाते व बिले']
    ];
  }

  const allNavLinks = [...baseLinks, ...personaLinks];

  return (
    <div className="app-shell" style={{ paddingBottom: '60px' }}>
      {/* ================= TOP NOTIFICATION STRIP ================= */}
      <div className="top-strip" style={{
        background: '#0d4624',
        color: '#ffffff',
        fontSize: '12px',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span>
          🌱 शेतकरी हित प्रथम • अस्सल खते व औषधे
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: isAdmin ? '#2e7d32' : (isStaff ? '#0288d1' : '#ed6c02'),
                color: '#fff',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {isAdmin ? '👑 Admin' : (isStaff ? '💼 Staff' : '🌾 ग्राहक')}
              </span>
              <span style={{ color: '#d4ecdc', fontSize: '11.5px', fontWeight: '600' }}>
                {user?.fullName || user?.username}
              </span>
              <button
                onClick={signOut}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '10.5px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                लॉगआउट
              </button>
            </div>
          ) : (
            <Link
              to="/admin/login"
              style={{
                color: '#b9dc68',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🔐 लॉगिन (Admin / शेतकरी)
            </Link>
          )}
        </div>
      </div>

      {/* ================= NAVBAR ================= */}
      <header className="navbar">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <img
            src={LogoImg}
            alt="स्वराज कृषी सेवा केंद्र"
            className="shop-logo"
            width="65"
            height="50"
            style={{ objectFit: 'contain' }}
          />
          <span className="brand-text">
            <strong>स्वराज</strong>
            <small>कृषी सेवा केंद्र</small>
          </span>
        </Link>

        {/* Mobile Toggle Button */}
        <button
          className="mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'मेनू बंद करा' : 'मेनू उघडा'}
        >
          {open ? <X /> : <Menu />}
        </button>

        {/* Navigation Links */}
        <nav className={open ? 'nav-links open' : 'nav-links'}>
          {allNavLinks.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'active-nav-link' : '')}
            >
              {label}
            </NavLink>
          ))}

          <Link
            className="nav-cta"
            to="/products"
            onClick={() => setOpen(false)}
          >
            <Search size={16} />
            उत्पादन शोधा
          </Link>

          {isAuthenticated && (
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
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                margin: '6px 0 0'
              }}
            >
              🚪 बाहेर पडा (Logout)
            </button>
          )}
        </nav>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main>{children}</main>

      {/* ================= FLOATING WHATSAPP BUTTON ================= */}
      <a
        className="whatsapp-float"
        href={`https://wa.me/${shop?.whatsapp || '918459568940'}?text=${encodeURIComponent('नमस्कार निलेश दादा, मला स्वराज कृषी सेवा केंद्रामधून कृषी सल्ला व औषधे हवी आहेत.')}`}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
      >
        <MessageCircle size={25} />
        <span>व्हॉट्सअ‍ॅपवर विचारा</span>
      </a>

      {/* ================= MOBILE BOTTOM NAVIGATION DOCK (SPA PWA READY) ================= */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: '#ffffff',
          borderTop: '1px solid #dce8de',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 1000,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.06)'
        }}
        className="mobile-bottom-dock"
      >
        {/* Slot 1: Home */}
        <NavLink
          to="/"
          end
          style={({ isActive }) => ({
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textDecoration: 'none', fontSize: '11px',
            fontWeight: isActive ? '700' : '500',
            color: isActive ? '#176b3a' : '#65776d'
          })}
        >
          <span style={{ fontSize: '18px' }}>🏠</span>
          <span>होम</span>
        </NavLink>

        {/* Slot 2: Products */}
        <NavLink
          to="/products"
          style={({ isActive }) => ({
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textDecoration: 'none', fontSize: '11px',
            fontWeight: isActive ? '700' : '500',
            color: isActive ? '#176b3a' : '#65776d'
          })}
        >
          <span style={{ fontSize: '18px' }}>🌾</span>
          <span>उत्पादने</span>
        </NavLink>

        {/* Slot 3: Role-aware centre action */}
        {isAdmin || isStaff ? (
          <NavLink
            to="/admin/billing"
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textDecoration: 'none', fontSize: '11px',
              fontWeight: isActive ? '700' : '500',
              color: isActive ? '#176b3a' : '#65776d'
            })}
          >
            <span style={{ fontSize: '22px', background: '#176b3a', color: '#fff', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🧾</span>
            <span>बिल</span>
          </NavLink>
        ) : isCustomer ? (
          <NavLink
            to="/customer/portal"
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textDecoration: 'none', fontSize: '11px',
              fontWeight: isActive ? '700' : '500',
              color: isActive ? '#176b3a' : '#65776d'
            })}
          >
            <span style={{ fontSize: '22px', background: '#176b3a', color: '#fff', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📄</span>
            <span>माझे खाते</span>
          </NavLink>
        ) : (
          <NavLink
            to="/services"
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textDecoration: 'none', fontSize: '11px',
              fontWeight: isActive ? '700' : '500',
              color: isActive ? '#176b3a' : '#65776d'
            })}
          >
            <span style={{ fontSize: '18px' }}>🚜</span>
            <span>सेवा</span>
          </NavLink>
        )}

        {/* Slot 4: Inventory (admin/staff) or Contact (public) */}
        {isAdmin || isStaff ? (
          <NavLink
            to="/admin/inventory"
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textDecoration: 'none', fontSize: '11px',
              fontWeight: isActive ? '700' : '500',
              color: isActive ? '#176b3a' : '#65776d'
            })}
          >
            <span style={{ fontSize: '18px' }}>📦</span>
            <span>स्टॉक</span>
          </NavLink>
        ) : (
          <NavLink
            to="/contact"
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textDecoration: 'none', fontSize: '11px',
              fontWeight: isActive ? '700' : '500',
              color: isActive ? '#176b3a' : '#65776d'
            })}
          >
            <span style={{ fontSize: '18px' }}>📞</span>
            <span>संपर्क</span>
          </NavLink>
        )}

        {/* Slot 5: Account / Dashboard / Login */}
        <NavLink
          to={isAdmin ? '/admin/dashboard' : (isStaff ? '/admin/bills' : (isCustomer ? '/customer/portal' : '/admin/login'))}
          style={({ isActive }) => ({
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textDecoration: 'none', fontSize: '11px',
            fontWeight: isActive ? '700' : '500',
            color: isActive ? '#176b3a' : '#65776d'
          })}
        >
          <span style={{ fontSize: '18px' }}>👤</span>
          <span>{isAdmin ? 'डॅशबोर्ड' : (isStaff ? 'बिले' : (isCustomer ? 'खाते' : 'लॉगिन'))}</span>
        </NavLink>
      </nav>

      {/* ================= FOOTER ================= */}
      <footer className="footer" style={{ marginTop: '40px', background: '#0e3a1f', color: '#ffffff', padding: '36px 20px 70px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: '#b9dc68' }}>स्वराज कृषी सेवा केंद्र</h3>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#d0dfd4' }}>
              शेतकरी बांधवांसाठी अस्सल कंपनीची खते, कीटकनाशके, बुरशीनाशके, विद्राव्य खते व आधुनिक कृषी सल्ला.
            </p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '15px', color: '#b9dc68' }}>द्रुत लिंक्स (Quick Links)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              <Link to="/products" style={{ color: '#ffffff', textDecoration: 'none' }}>• उत्पादने यादी</Link>
              <Link to="/customer/portal" style={{ color: '#ffffff', textDecoration: 'none' }}>• शेतकरी ग्राहक पोर्टल</Link>
              <Link to="/admin/login" style={{ color: '#ffffff', textDecoration: 'none' }}>• व्यवस्थापक / कर्मचारी लॉगिन</Link>
              <Link to="/services" style={{ color: '#ffffff', textDecoration: 'none' }}>• सेवा व माहिती</Link>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '15px', color: '#b9dc68' }}>संपर्क व पत्ता</h4>
            <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#d0dfd4' }}>
              <div><strong>प्रोप्रायटर:</strong> {shop?.ownerName || ShopProp.ownerName || 'निलेश त्र्यंबक दवंगे'}</div>
              <div><strong>मोबाईल:</strong> {shop?.phone || ShopProp.phone || '+91 8459568940'}</div>
              <div><strong>पत्ता:</strong> {shop?.address || ShopProp.address || 'मु. पो. कानमंडाळे, ता. चांदवड, जि. नाशिक'}</div>
            </div>
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '28px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: '12px',
          color: '#a0b8a8'
        }}>
          © {new Date().getFullYear()} स्वराज कृषी सेवा केंद्र • सर्व हक्क राखीव.
        </div>
      </footer>
    </div>
  );
}
