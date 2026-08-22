import React from 'react';

import {
  Routes,
  Route
} from 'react-router-dom';

import Layout from './components/Layout';

import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';
import ProductRequest from './pages/ProductRequest';


export default function App() {

  return (

    <Layout>

      <Routes>

        {/* =========================================
            HOME
        ========================================== */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* =========================================
            PRODUCTS
        ========================================== */}

        <Route
          path="/products"
          element={<Products />}
        />


        {/* =========================================
            PRODUCT DETAIL
        ========================================== */}

        <Route
          path="/products/:id"
          element={<ProductDetail />}
        />


        {/* =========================================
            PRODUCT REQUEST
        ========================================== */}

        <Route
          path="/product-request"
          element={<ProductRequest />}
        />


        {/* =========================================
            ABOUT
        ========================================== */}

        <Route
          path="/about"
          element={<About />}
        />


        {/* =========================================
            SERVICES
        ========================================== */}

        <Route
          path="/services"
          element={<Services />}
        />


        {/* =========================================
            CONTACT
        ========================================== */}

        <Route
          path="/contact"
          element={<Contact />}
        />

      </Routes>

    </Layout>

  );

}