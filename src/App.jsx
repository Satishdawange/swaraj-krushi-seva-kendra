import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';

// Public Pages
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const Contact = lazy(() => import('./pages/Contact'));
const ProductRequest = lazy(() => import('./pages/ProductRequest'));

// Login & Customer Portal
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

// Admin, Billing, Inventory & Google Sheets
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CreateBill = lazy(() => import('./pages/CreateBill'));
const CreateChallan = lazy(() => import('./pages/CreateChallan'));
const BillHistory = lazy(() => import('./pages/BillHistory'));
const ChallanHistory = lazy(() => import('./pages/ChallanHistory'));
const Inventory = lazy(() => import('./pages/Inventory'));
const InventoryManage = lazy(() => import('./pages/InventoryManage'));
const GoogleSheetsIntegration = lazy(() => import('./pages/GoogleSheetsIntegration'));

export default function App() {
  return (
    <AuthProvider>
      <AppShell>
        <Suspense fallback={<div className="page-loading" role="status" style={{ textAlign: 'center', padding: '60px 20px', color: '#176b3a', fontSize: '16px' }}>⏳ लोड होत आहे…</div>}>
        <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/product-request" element={<ProductRequest />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />

          {/* Unified Login */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Customer / Farmer Portal */}
          <Route
            path="/customer/portal"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/password"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'staff']}>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/billing"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <CreateBill />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bills"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <BillHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/challan/create"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <CreateChallan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/challans"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <ChallanHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/inventory"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/inventory/manage"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <InventoryManage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/inventory/manage/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <InventoryManage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sheets"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <GoogleSheetsIntegration />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
        </Suspense>
      </AppShell>
    </AuthProvider>
  );
}
