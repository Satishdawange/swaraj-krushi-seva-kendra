import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          border: '4px solid #e3f2df',
          borderTop: '4px solid #176b3a',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#66736b', fontSize: '15px', fontWeight: '500' }}>
          सुरक्षित पडताळणी सुरू आहे... (Verifying admin access...)
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAdmin) {
    // Redirect unauthenticated user to admin login
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
