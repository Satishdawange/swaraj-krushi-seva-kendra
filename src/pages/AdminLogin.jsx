import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoImg from '../images/sksklogo.png';
import '../CSS/billing.css';

export default function AdminLogin() {
  const { signIn, isAuthenticated, role, loading, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activePersona, setActivePersona] = useState('admin'); // 'admin' | 'staff' | 'customer'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  const from = location.state?.from?.pathname || (role === 'customer' ? '/customer/portal' : '/admin/billing');
  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  // Quick fill demo credentials
  const selectPersona = (persona) => {
    setActivePersona(persona);
    setError('');
    setIdentifier('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('कृपया युझरनेम किंवा मोबाईल नंबर भरा.');
      return;
    }

    if (activePersona !== 'customer' && !password.trim()) {
      setError('कृपया पासवर्ड भरा.');
      return;
    }

    setIsSubmitting(true);

    try {
      const loggedUser = await signIn(identifier.trim(), password);
      if (loggedUser.role === 'customer') {
        navigate('/customer/portal', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'लॉगिन करताना अडचण आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px 16px',
      background: 'radial-gradient(circle at 50% 15%, #e8f5e9 0%, #f6f8f5 70%)'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 12px 36px rgba(23, 107, 58, 0.12)',
        border: '1px solid #d4e5d8',
        padding: '32px 28px',
        boxSizing: 'border-box'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <img
            src={LogoImg}
            alt="स्वराज कृषी सेवा केंद्र"
            style={{ width: '85px', height: '65px', objectFit: 'contain', margin: '0 auto 8px', display: 'block' }}
          />
          <h2 style={{ fontSize: '22px', color: '#176b3a', margin: '0 0 4px', fontWeight: '800' }}>
            स्वराज कृषी सेवा केंद्र
          </h2>
          <p style={{ fontSize: '13px', color: '#556b5c', margin: 0 }}>
            पोर्टल लॉगिन • Persona Selection
          </p>
        </div>

        {/* Persona Switcher Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
          background: '#f0f5f1',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => selectPersona('admin')}
            style={{
              padding: '8px 4px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: activePersona === 'admin' ? '#176b3a' : 'transparent',
              color: activePersona === 'admin' ? '#ffffff' : '#334e3b',
              transition: 'all 0.2s'
            }}
          >
            👑 व्यवस्थापक
          </button>
          <button
            type="button"
            onClick={() => selectPersona('staff')}
            style={{
              padding: '8px 4px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: activePersona === 'staff' ? '#176b3a' : 'transparent',
              color: activePersona === 'staff' ? '#ffffff' : '#334e3b',
              transition: 'all 0.2s'
            }}
          >
            💼 कर्मचारी
          </button>
          <button
            type="button"
            onClick={() => selectPersona('customer')}
            style={{
              padding: '8px 4px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: activePersona === 'customer' ? '#176b3a' : 'transparent',
              color: activePersona === 'customer' ? '#ffffff' : '#334e3b',
              transition: 'all 0.2s'
            }}
          >
            🌾 शेतकरी ग्राहक
          </button>
        </div>

        {/* Role guidance */}
        <div style={{
          background: '#edf7ed',
          border: '1px solid #c8e6c9',
          borderRadius: '10px',
          padding: '8px 12px',
          marginBottom: '18px',
          fontSize: '11.5px',
          color: '#2e7d32',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>
            {activePersona === 'admin' && '👑 Admin: पूर्ण नियंत्रण (बिल, चालन, स्टॉक, गुगल शीट्स)'}
            {activePersona === 'staff' && '💼 Staff: जलद बिलिंग व स्टॉक पाहणी'}
            {activePersona === 'customer' && '🌾 Farmer: मोबाईल नंबरने ग्राहक पोर्टल उघडा'}
          </span>
        </div>

        {/* Error Notification */}
        {(error || authError) && (
          <div style={{
            background: '#fef3f2',
            color: '#b42318',
            border: '1px solid #fecdca',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{error || authError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#27382d', marginBottom: '6px' }}>
              {activePersona === 'customer' ? '१० अंकी मोबाईल नंबर किंवा युझरनेम:' : 'युझरनेम / ईमेल / मोबाईल:'}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={activePersona === 'customer' ? 'उदा. 9822012345' : 'उदा. admin किंवा nilesh@swaraj.com'}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1.5px solid #c2d6c7',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#27382d' }}>
                पासवर्ड:
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', color: '#176b3a', fontSize: '11.5px', cursor: 'pointer', fontWeight: '600' }}
              >
                {showPassword ? 'पासवर्ड लपवा' : 'पासवर्ड दाखवा'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={activePersona === 'customer' ? 'ग्राहक लॉगिनसाठी रिकामे ठेवू शकता' : 'पासवर्ड प्रविष्ट करा'}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1.5px solid #c2d6c7',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              required={activePersona !== 'customer'}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              background: '#176b3a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 4px 12px rgba(23, 107, 58, 0.25)'
            }}
          >
            {isSubmitting ? 'लॉगिन होत आहे...' : `लॉगिन करा (${activePersona === 'admin' ? 'Admin' : activePersona === 'staff' ? 'Staff' : 'ग्राहक'})`}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf2ee', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '11.5px', color: '#7a8d80' }}>
            Admin/Staff साठी deployed Google Sheets session API आवश्यक आहे. पासवर्ड browser मध्ये जतन होत नाही; या device वर फक्त revocable session token ठेवला जातो.
          </p>
        </div>
      </div>
    </div>
  );
}
