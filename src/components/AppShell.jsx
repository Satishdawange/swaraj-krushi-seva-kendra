import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import LogoImg from '../images/sksklogo.png';
import { Menu, X, Search, MessageCircle, Phone, MapPin } from './Icons';
import { getShopSettings } from '../service/shopService';
import { useAuth } from '../context/AuthContext';
import ShopProp from '../config/shopProps';
import {
  refreshGoogleSheetsData,
  testGoogleSheetsConnection
} from '../service/googleSheetsService';

const publicLinks = [
  ['/', 'मुख्यपृष्ठ'],
  ['/products', 'उत्पादने'],
  ['/services', 'सेवा'],
  ['/about', 'आमच्याबद्दल'],
  ['/contact', 'संपर्क']
];

export default function AppShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [shop, setShop] = useState(null);
  const [sheetsStatus, setSheetsStatus] = useState('checking');
  const [isRefreshingSheets, setIsRefreshingSheets] = useState(false);
  const [sheetsRefreshMessage, setSheetsRefreshMessage] = useState('');
  const [dataRefreshVersion, setDataRefreshVersion] = useState(0);
  const { user, isAdmin, isStaff, isCustomer, isAuthenticated, authError, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    getShopSettings()
      .then((settings) => {
        if (active) setShop(settings);
      })
      .catch((error) => {
        console.warn('Unable to load shop settings:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdmin) {
      setSheetsStatus('checking');
      setSheetsRefreshMessage('');
      return undefined;
    }

    let active = true;
    const checkConnection = async () => {
      const result = await testGoogleSheetsConnection();
      if (active) setSheetsStatus(result.success ? 'connected' : 'disconnected');
    };
    const onConfigChange = (event) => {
      setSheetsStatus(event.detail?.status === 'connected' ? 'connected' : 'disconnected');
    };
    const onDataRefreshed = () => {
      setDataRefreshVersion((version) => version + 1);
      setSheetsRefreshMessage('शीटमधील डेटा अद्ययावत झाला.');
    };

    window.addEventListener('sksk-sheets-config-change', onConfigChange);
    window.addEventListener('sksk-sheets-data-refreshed', onDataRefreshed);
    checkConnection();
    const intervalId = window.setInterval(checkConnection, 60_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('sksk-sheets-config-change', onConfigChange);
      window.removeEventListener('sksk-sheets-data-refreshed', onDataRefreshed);
    };
  }, [isAdmin]);

  const handleRefreshSheets = async () => {
    setIsRefreshingSheets(true);
    setSheetsRefreshMessage('');
    try {
      await refreshGoogleSheetsData();
    } catch (error) {
      console.error('Google Sheets refresh failed:', error);
      setSheetsRefreshMessage(error.message || 'शीटमधील डेटा अद्ययावत करता आला नाही.');
    } finally {
      setIsRefreshingSheets(false);
    }
  };

  const roleLinks = isAdmin
    ? [
        ['/admin/dashboard', 'डॅशबोर्ड'],
        ['/admin/billing', 'नवीन बिल'],
        ['/admin/bills', 'बिल इतिहास'],
        ['/admin/challans', 'चालन इतिहास'],
        ['/admin/inventory', 'इन्व्हेंटरी'],
        ['/admin/sheets', 'डेटा सेटिंग्ज'],
        ['/account/password', 'पासवर्ड बदला']
      ]
    : isStaff
      ? [
          ['/admin/billing', 'नवीन बिल'],
          ['/admin/bills', 'बिल इतिहास'],
          ['/admin/challans', 'चालन इतिहास'],
          ['/admin/inventory', 'इन्व्हेंटरी'],
          ['/account/password', 'पासवर्ड बदला']
        ]
      : isCustomer
        ? [
            ...publicLinks,
            ['/customer/portal', 'माझे खाते'],
            ['/account/password', 'पासवर्ड बदला']
          ]
        : publicLinks;

  const dockLinks = isAdmin
    ? [
        ['/', 'होम', '⌂'],
        ['/admin/dashboard', 'डॅशबोर्ड', '▦'],
        ['/admin/billing', 'नवीन बिल', '+'],
        ['/admin/inventory', 'स्टॉक', '□'],
        ['/admin/bills', 'बिले', '≡']
      ]
    : isStaff
      ? [
          ['/', 'होम', '⌂'],
          ['/admin/billing', 'नवीन बिल', '+'],
          ['/admin/bills', 'बिले', '≡'],
          ['/admin/inventory', 'स्टॉक', '□'],
          ['/contact', 'संपर्क', '☎']
        ]
      : isCustomer
        ? [
            ['/', 'होम', '⌂'],
            ['/products', 'उत्पादने', '◇'],
            ['/services', 'सेवा', '↗'],
            ['/customer/portal', 'माझे खाते', '○'],
            ['/contact', 'संपर्क', '☎']
          ]
        : [
            ['/', 'होम', '⌂'],
            ['/products', 'उत्पादने', '◇'],
            ['/services', 'सेवा', '↗'],
            ['/contact', 'संपर्क', '☎'],
            ['/admin/login', 'लॉगिन', '○']
          ];

  const phone = shop?.phone || ShopProp.phone || '+91 8459568940';
  const address = shop?.address || ShopProp.address || 'मु. पो. कानमंडाळे, ता. चांदवड, जि. नाशिक';
  const whatsapp = shop?.whatsapp || '918459568940';

  return (
    <div className="app-shell experience-shell">
      <div className="top-strip">
        <span className="top-strip-message">शेतकरी हित प्रथम <span aria-hidden="true">•</span> अस्सल कृषी उत्पादने आणि मार्गदर्शन</span>
        <div className="top-strip-account">
          {isAuthenticated ? (
            <>
              <span className={`role-badge${isAdmin ? ' is-admin' : ''}`}>
                {isAdmin ? 'व्यवस्थापक' : isStaff ? 'कर्मचारी' : 'शेतकरी'}
              </span>
              <span className="account-name">{user?.fullName || user?.username}</span>
              <button type="button" onClick={signOut} className="top-strip-action">बाहेर पडा</button>
            </>
          ) : (
            <Link to="/admin/login" className="top-strip-action">खाते लॉगिन</Link>
          )}
        </div>
      </div>

      <header className="navbar experience-navbar">
        <Link to="/" className="brand" aria-label="स्वराज कृषी सेवा केंद्र - मुख्यपृष्ठ">
          <img src={LogoImg} alt="" className="shop-logo" width="54" height="48" />
          <span className="brand-text">
            <strong>स्वराज</strong>
            <small>कृषी सेवा केंद्र</small>
          </span>
        </Link>

        <button
          type="button"
          className="mobile-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'मेनू बंद करा' : 'मेनू उघडा'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav
          id="primary-navigation"
          className={`nav-links experience-nav-links${menuOpen ? ' open' : ''}`}
          aria-label="मुख्य नेव्हिगेशन"
        >
          {roleLinks.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {label}
            </NavLink>
          ))}
          {!isAuthenticated && (
            <Link className="nav-cta" to="/products" onClick={() => setMenuOpen(false)}>
              <Search size={17} />
              उत्पादन शोधा
            </Link>
          )}
        </nav>
      </header>

      {isAdmin && (
        <div className="admin-sheet-toolbar">
          <Link
            to="/admin/sheets"
            className={`sheet-connection-status${sheetsStatus === 'connected' ? ' is-connected' : ' is-disconnected'}`}
            title="Google Sheets जोडणी सेटिंग्ज उघडा"
          >
            <span className="sheet-status-dot" aria-hidden="true" />
            <span>
              {sheetsStatus === 'checking'
                ? 'Google Sheets तपासत आहे'
                : sheetsStatus === 'connected'
                  ? 'Google Sheets जोडलेले'
                  : 'Google Sheets जोडलेले नाही'}
            </span>
          </Link>
          <button
            type="button"
            className="sheet-refresh-button"
            onClick={handleRefreshSheets}
            disabled={isRefreshingSheets || sheetsStatus !== 'connected'}
            title="Google Sheets मधील नवीनतम डेटा अॅपमध्ये आणा"
          >
            <span className={isRefreshingSheets ? 'sheet-refresh-icon is-spinning' : 'sheet-refresh-icon'} aria-hidden="true">↻</span>
            {isRefreshingSheets ? 'सिंक सुरू आहे…' : 'डेटा सिंक करा'}
          </button>
          <span className="sheet-refresh-message" role="status" aria-live="polite">
            {sheetsRefreshMessage}
          </span>
        </div>
      )}

      {authError && location.pathname !== '/admin/login' && (
        <div className="auth-status-notice" role="alert">{authError}</div>
      )}

      <main key={dataRefreshVersion}>{children}</main>

      <a
        className="whatsapp-float"
        href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('नमस्कार, मला स्वराज कृषी सेवा केंद्रामधून कृषी सल्ला व उत्पादनांची माहिती हवी आहे.')}`}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp वर संपर्क करा"
      >
        <MessageCircle size={23} />
        <span>WhatsApp वर विचारा</span>
      </a>

      <nav className="mobile-bottom-dock" aria-label="जलद नेव्हिगेशन">
        {dockLinks.map(([to, label, icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `dock-link${isActive ? ' active' : ''}${label === 'नवीन बिल' ? ' dock-primary' : ''}`}
            aria-label={label}
          >
            <span className="dock-icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <footer className="footer experience-footer">
        <div className="footer-grid">
          <div className="footer-about">
            <Link to="/" className="footer-brand">स्वराज कृषी सेवा केंद्र</Link>
            <p>शेतकरी बांधवांसाठी दर्जेदार कृषी उत्पादने, विश्वासार्ह माहिती आणि सोपे डिजिटल व्यवहार.</p>
          </div>
          <div>
            <h2>उपयुक्त दुवे</h2>
            <div className="footer-links">
              <Link to="/products">उत्पादने पाहा</Link>
              <Link to="/services">आमच्या सेवा</Link>
              <Link to="/customer/portal">शेतकरी खाते</Link>
              <Link to="/admin/login">कर्मचारी लॉगिन</Link>
            </div>
          </div>
          <div>
            <h2>आमच्याशी संपर्क</h2>
            <div className="footer-contact">
              <span><Phone size={15} /> {phone}</span>
              <span><MapPin size={15} /> {address}</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} स्वराज कृषी सेवा केंद्र <span>•</span> सर्व हक्क राखीव</div>
      </footer>
    </div>
  );
}
