import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoImg from '../images/sksklogo.png';
import '../CSS/billing.css';

export default function AdminLogin() {
  const { signIn, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to billing immediately
  const from = location.state?.from?.pathname || '/admin/billing';
  if (!loading && isAdmin) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('कृपया ईमेल आणि पासवर्ड दोन्ही भरा.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signIn(email.trim(), password);
      // Navigate to destination on success
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setError('चुकीचा ईमेल किंवा पासवर्ड! कृपया पुन्हा तपासा.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('ईमेल अजून कन्फर्म केलेला नाही. Supabase डॅशबोर्डमध्ये "Auto Confirm User" तपासा.');
      } else {
        setError(err.message || 'लॉगिन करताना अडचण आली. कृपया पुन्हा प्रयत्न करा.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'radial-gradient(circle at 50% 10%, #e9f5ec 0%, #f8f8f1 60%)'
    }}>
      <div className="admin-login-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src={LogoImg}
            alt="स्वराज कृषी सेवा केंद्र"
            style={{ width: '80px', height: '60px', objectFit: 'contain', margin: '0 auto 10px' }}
          />
          <h2 style={{ fontSize: '24px', color: '#176b3a', margin: '0 0 6px', fontWeight: '800' }}>
            व्यवस्थापक लॉगिन
          </h2>
          <p style={{ fontSize: '13px', color: '#65776d', margin: 0 }}>
            स्वराज कृषी सेवा केंद्र • Admin Portal
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            background: '#fef3f2',
            color: '#b42318',
            border: '1px solid #fecdca',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#27382d' }}>
              ईमेल आयडी (Admin Email):
            </label>
            <input
              type="email"
              placeholder="admin@swarajksk.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1.5px solid #d5e2d7',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#27382d' }}>
                पासवर्ड (Password):
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: '#176b3a',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {showPassword ? 'पासवर्ड लपवा' : 'पासवर्ड दाखवा'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1.5px solid #d5e2d7',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-btn"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              borderRadius: '14px',
              justifyContent: 'center'
            }}
          >
            {isSubmitting ? '🔐 तपासणी सुरू आहे...' : '🔒 लॉगिन करा (Sign In)'}
          </button>
        </form>

        {/* Security / Help note for Store Owner */}
        <div style={{
          marginTop: '26px',
          padding: '14px',
          background: '#f8faf8',
          border: '1px dashed #d5e3d7',
          borderRadius: '12px',
          fontSize: '11.5px',
          color: '#5b6e61',
          lineHeight: '1.6'
        }}>
          🛡️ <strong>सुरक्षित ॲडमिन पोर्टल:</strong> हा विभाग फक्त दुकानाच्या व्यवस्थापकासाठी आहे. Supabase Auth द्वारे एनक्रिप्टेड टोकन प्रमाणीकरण केले जाते.
        </div>
      </div>
    </div>
  );
}
