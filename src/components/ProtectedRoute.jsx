import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = ['admin', 'staff'] }) {
  const { user, isAuthenticated, role, loading } = useAuth();
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
          सुरक्षित पडताळणी सुरू आहे... (Verifying access...)
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

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check role authorization
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'customer') {
      return <Navigate to="/customer/portal" replace />;
    }
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
