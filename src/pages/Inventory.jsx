import React, { useState, useEffect } from 'react';
import {
  fetchRecentRecords,
  fetchGoogleSheetRecords,
  getAllInventoryItems,
  saveInventoryItemLocal,
  adjustInventoryStock,
  recordBulkPurchaseLot
} from '../service/googleSheetsService';
import { normalizeInventoryRow } from '../utils/sheetData';
import '../CSS/billing.css';

const CATEGORIES = [
  'सर्व उत्पादने',
  'खते (Fertilizers)',
  'कीटकनाशके (Insecticides)',
  'बुरशीनाशके (Fungicides)',
  'तणनाशके (Herbicides)',
  'बी-बियाणे (Seeds)',
  'सूक्ष्मअन्नद्रव्ये (Micronutrients)',
  'ठिबक व सिंचन (Irrigation)',
  'इतर कृषी उत्पादने'
];

const UNITS = ['नग', 'बॅग (५० किलो)', 'बॅग (२५ किलो)', 'लिटर', '५०० मिली', '२५० मिली', '१०० मिली', 'किलो', '५०० ग्रॅम', '२५० ग्रॅम', '१०० ग्रॅम', 'पाकीट'];

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'purchase' | 'lots' | 'alerts'
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination for Current Stock
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('सर्व उत्पादने');
  const [filterCategories, setFilterCategories] = useState(() => CATEGORIES.slice(1).map((label) => ({ value: label, label })));
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Bulk Purchase Form State
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [category, setCategory] = useState('खते (Fertilizers)');
  const [subcategory, setSubcategory] = useState('');
  const [productName, setProductName] = useState('');
  const [unit, setUnit] = useState('नग');
  const [isBulkPurchase, setIsBulkPurchase] = useState(true);
  const [bulkQty, setBulkQty] = useState(50);
  const [totalCost, setTotalCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [minAlertQty, setMinAlertQty] = useState(10);
  const [notes, setNotes] = useState('');
  const [purchaseSuccess, setPurchaseSuccess] = useState('');

  // Purchase Lots History
  const [purchaseLots, setPurchaseLots] = useState([]);
  const [lotsPage, setLotsPage] = useState(1);
  const [lotsTotalPages, setLotsTotalPages] = useState(1);
  const [lotsTotal, setLotsTotal] = useState(0);

  // Quick adjust modal
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('स्टॉक वाढवला');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchGoogleSheetRecords('Inventory').catch(() => []),
      fetchGoogleSheetRecords('Categories').catch(() => []),
    ]).then(([inventoryRows, categoryRows]) => {
      const categoryName = (row) => row.Name_MR || row.name || row.name_mr || row.Name || row.Name_EN || row.name_en || '';
      const categories = [];
      const seen = new Set();
      inventoryRows.forEach((row) => {
        const id = row.Category_ID ?? row.category_id ?? row.categoryId ?? '';
        const rawCategory = row.Category ?? row.category ?? row.Category_MR ?? row.Category_EN ?? row.Category_Name ?? row['Category Name'] ?? '';
        const matched = categoryRows.find((item) => String(item.Category_ID ?? item.id ?? item.ID ?? '').toLowerCase() === String(id).toLowerCase())
          || categoryRows.find((item) => [item.Name_MR, item.Name_EN, item.name, item.name_en].filter(Boolean).some((name) => String(name).trim().toLowerCase() === String(rawCategory).trim().toLowerCase()));
        const value = String(id || rawCategory).trim();
        if (!value || seen.has(value.toLowerCase())) return;
        seen.add(value.toLowerCase());
        categories.push({ value, label: categoryName(matched || {}) || rawCategory || value });
      });
      if (active && categories.length) setFilterCategories(categories);
    });
    return () => { active = false; };
  }, []);

  // Load Inventory with 10 records per page
  const loadInventoryData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchRecentRecords('Inventory', {
        page,
        limit: 10,
        search: searchTerm,
        category: selectedCategory === 'सर्व उत्पादने' ? '' : selectedCategory
      });
      setInventoryList((res.items || []).map(normalizeInventoryRow));
      setTotalPages(res.totalPages || 1);
      setTotalRecords(res.total || 0);
      setCurrentPage(res.page || 1);
    } catch (err) {
      console.warn('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Purchase Lots with pagination
  const loadPurchaseLots = async (page = 1) => {
    try {
      const res = await fetchRecentRecords('Purchase_Lots', { page, limit: 10 });
      setPurchaseLots(res.items || []);
      setLotsTotalPages(res.totalPages || 1);
      setLotsTotal(res.total || 0);
      setLotsPage(res.page || 1);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (activeTab === 'stock' || activeTab === 'alerts') {
      loadInventoryData(currentPage);
    } else if (activeTab === 'lots') {
      loadPurchaseLots(lotsPage);
    }
  }, [activeTab, currentPage, lotsPage, selectedCategory, searchTerm]);

  // Derived unit cost in Bulk purchase
  const derivedUnitCost = bulkQty > 0 && totalCost ? Math.round((Number(totalCost) / Number(bulkQty)) * 100) / 100 : 0;
  const derivedProfitMargin = sellingPrice && derivedUnitCost > 0 ? Math.round((Number(sellingPrice) - derivedUnitCost) * 100) / 100 : 0;

  // Handle New Purchase Lot submission
  const handlePurchaseSubmit = (e) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert('कृपया उत्पादनाचे नाव प्रविष्ट करा.');
      return;
    }
    if (!totalCost || Number(totalCost) <= 0) {
      alert('कृपया एकूण खरेदी किंमत प्रविष्ट करा.');
      return;
    }

    const lotRecord = recordBulkPurchaseLot({
      date: purchaseDate,
      supplier: supplier.trim() || 'अधिकृत डीलर',
      category,
      subcategory: subcategory.trim(),
      productName: productName.trim(),
      bulkQty: Number(bulkQty) || 1,
      unit,
      totalCost: Number(totalCost),
      sellingPrice: Number(sellingPrice) || derivedUnitCost * 1.15,
      notes: notes.trim()
    });

    setPurchaseSuccess(`✅ '${lotRecord.productName}' चे ${lotRecord.bulkQty} ${lotRecord.unit} यशस्वीरीत्या इन्व्हेंटरीमध्ये जोडले गेले!`);
    // Reset form
    setProductName('');
    setTotalCost('');
    setSellingPrice('');
    setSubcategory('');
    setNotes('');

    setTimeout(() => {
      setPurchaseSuccess('');
      setActiveTab('stock');
      loadInventoryData(1);
    }, 1500);
  };

  // Handle Stock Adjust
  const handleSaveAdjustment = () => {
    if (!adjustItem || !adjustDelta) return;
    adjustInventoryStock(adjustItem.id, Number(adjustDelta), adjustReason);
    setAdjustItem(null);
    setAdjustDelta('');
    loadInventoryData(currentPage);
  };

  // Low stock products
  const lowStockList = inventoryList.filter(i => Number(i.availableStock) <= Number(i.minAlertQty || 10));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Title & Stats Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', color: '#176b3a', fontWeight: '800' }}>
            📦 इन्व्हेंटरी व साठा व्यवस्थापन (Inventory & Stock)
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#556b5c' }}>
            खरेदी नोंदी, घाऊक खरेदी लॉट, शिल्लक साठा व बिलिंग ऑटो-स्टॉक डिडक्शन
          </p>
        </div>

        <button
          onClick={() => {
            setActiveTab('purchase');
            setPurchaseSuccess('');
          }}
          style={{
            background: '#176b3a',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(23, 107, 58, 0.2)'
          }}
        >
          ➕ नवीन खरेदी नोंद (Inward Lot)
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e1e8e3',
        marginBottom: '20px',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => { setActiveTab('stock'); setCurrentPage(1); }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'stock' ? '3px solid #176b3a' : '3px solid transparent',
            color: activeTab === 'stock' ? '#176b3a' : '#65776d',
            fontWeight: activeTab === 'stock' ? '800' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📊 सध्याचा साठा (Current Stock)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('purchase')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'purchase' ? '3px solid #176b3a' : '3px solid transparent',
            color: activeTab === 'purchase' ? '#176b3a' : '#65776d',
            fontWeight: activeTab === 'purchase' ? '800' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          ➕ खरेदी नोंद (New Purchase Lot)
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('lots'); setLotsPage(1); }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'lots' ? '3px solid #176b3a' : '3px solid transparent',
            color: activeTab === 'lots' ? '#176b3a' : '#65776d',
            fontWeight: activeTab === 'lots' ? '800' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📜 खरेदी लॉट इतिहास (Purchase Lots)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'alerts' ? '3px solid #b42318' : '3px solid transparent',
            color: activeTab === 'alerts' ? '#b42318' : '#65776d',
            fontWeight: activeTab === 'alerts' ? '800' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          ⚠️ कमी साठा इशारा (Low Stock Alerts)
        </button>
      </div>

      {/* ---------------- TAB 1: CURRENT STOCK ---------------- */}
      {activeTab === 'stock' && (
        <div>
          {/* Search & Category Filter Bar */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e1e8e3',
            marginBottom: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: '10px', flex: '1', minWidth: '280px' }}>
              <input
                type="text"
                placeholder="🔍 उत्पादनाचे नाव, कंपनी किंवा कोड शोधा..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #c2d6c7',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334e3b' }}>कॅटेगरी:</label>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #c2d6c7',
                  fontSize: '13px',
                  background: '#ffffff'
                }}
              >
                <option value="सर्व उत्पादने">सर्व उत्पादने</option>
                {filterCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e1e8e3',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f4f8f5', borderBottom: '2px solid #dbe6de', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', color: '#27382d' }}>उत्पादनाचे नाव</th>
                    <th style={{ padding: '12px 14px', color: '#27382d' }}>कॅटेगरी</th>
                    <th style={{ padding: '12px 14px', color: '#27382d' }}>युनिट</th>
                    <th style={{ padding: '12px 14px', color: '#27382d' }}>खरेदी दर</th>
                    <th style={{ padding: '12px 14px', color: '#27382d' }}>विक्री दर (MRP)</th>
                    <th style={{ padding: '12px 14px', color: '#27382d' }}>उपलब्ध साठा</th>
                    <th style={{ padding: '12px 14px', color: '#27382d' }}>स्टॉक स्थिती</th>
                    <th style={{ padding: '12px 14px', color: '#27382d', textAlign: 'center' }}>ऍडजस्ट</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#65776d' }}>
                        ⏳ साठा माहिती लोड होत आहे...
                      </td>
                    </tr>
                  ) : inventoryList.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#65776d' }}>
                        कोणतेही उत्पादन सापडले नाही.
                      </td>
                    </tr>
                  ) : (
                    inventoryList.map((item, idx) => {
                      const stock = Number(item.availableStock || 0);
                      const minAlert = Number(item.minAlertQty || 10);
                      const isLow = stock <= minAlert;
                      const isZero = stock === 0;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #edf2ee' }}>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#176b3a' }}>
                            {item.name}
                            {item.company && (
                              <div style={{ fontSize: '11px', color: '#7a8d80', fontWeight: '400' }}>
                                {item.company}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#555' }}>{item.category || 'इतर'}</td>
                          <td style={{ padding: '12px 14px', color: '#555' }}>{item.unit || 'नग'}</td>
                          <td style={{ padding: '12px 14px', color: '#555' }}>₹ {Number(item.purchasePrice || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#27382d' }}>
                            ₹ {Number(item.sellingPrice || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: '800', fontSize: '14px', color: isZero ? '#b42318' : (isLow ? '#b06000' : '#137333') }}>
                            {stock} {item.unit || 'नग'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              background: isZero ? '#fce8e6' : (isLow ? '#fef7e0' : '#e6f4ea'),
                              color: isZero ? '#c5221f' : (isLow ? '#b06000' : '#137333')
                            }}>
                              {isZero ? '❌ संपला (Out)' : (isLow ? '⚠️ अल्प साठा' : '✓ मुबलक साठा')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustItem(item);
                                setAdjustDelta('');
                              }}
                              style={{
                                background: '#f0f5f1',
                                border: '1px solid #c2d6c7',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '11.5px',
                                cursor: 'pointer',
                                color: '#176b3a',
                                fontWeight: '600'
                              }}
                            >
                              ⚙️ बदल (+/-)
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Always 10 per page) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: '#fafbfa',
              borderTop: '1px solid #edf2ee',
              fontSize: '12.5px',
              color: '#556b5c'
            }}>
              <div>
                एकूण नोंदणीकृत: <strong>{totalRecords}</strong> उत्पादने (पान <strong>{currentPage}</strong> / {totalPages})
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{
                    background: currentPage <= 1 ? '#eee' : '#176b3a',
                    color: currentPage <= 1 ? '#999' : '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '12px'
                  }}
                >
                  ◀ मागील १०
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    background: currentPage >= totalPages ? '#eee' : '#176b3a',
                    color: currentPage >= totalPages ? '#999' : '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '12px'
                  }}
                >
                  पुढील १० ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: BULK PURCHASE INWARD ENTRY ---------------- */}
      {activeTab === 'purchase' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e1e8e3',
          padding: '28px',
          maxWidth: '850px',
          margin: '0 auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
        }}>
          <h2 style={{ fontSize: '18px', color: '#176b3a', margin: '0 0 6px', fontWeight: '800' }}>
            ➕ नवीन खरेदी नोंद व घाऊक लॉट (Inward Stock Entry)
          </h2>
          <p style={{ fontSize: '13px', color: '#65776d', margin: '0 0 20px' }}>
            घाऊक (Bulk) किंवा सुटे खरेदी केलेल्या खते, औषधे व बियाणांची नोंद करा. हा साठा लगेच उपलब्ध साठ्यात वाढेल.
          </p>

          {purchaseSuccess && (
            <div style={{
              background: '#e6f4ea',
              color: '#137333',
              border: '1px solid #ceead6',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontWeight: '700',
              fontSize: '13.5px'
            }}>
              {purchaseSuccess}
            </div>
          )}

          <form onSubmit={handlePurchaseSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>खरेदी तारीख:</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>सप्लायर / डीलरचे नाव:</label>
                <input
                  type="text"
                  placeholder="उदा. ग्रीनफिल्ड ऍग्रो एजन्सी, नाशिक"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>कॅटेगरी (Category):</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
                >
                  {CATEGORIES.filter(c => c !== 'सर्व उत्पादने').map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>उप-कॅटेगरी (Subcategory):</label>
                <input
                  type="text"
                  placeholder="उदा. विद्राव्य खत, बुरशीनाशक, दाणेदार"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>उत्पादनाचे नाव (Product Name): *</label>
                <input
                  type="text"
                  placeholder="उदा. क्लोरोपायरीफॉस २०% EC किंवा १९:१९:१९ विद्राव्य खत"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #176b3a', boxSizing: 'border-box', fontSize: '14px', fontWeight: '600' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>युनिट / पॅक प्रकार:</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
                >
                  {UNITS.map((u, idx) => (
                    <option key={idx} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  खरेदी संख्या (Bulk Qty / Nos): *
                </label>
                <input
                  type="number"
                  min="1"
                  value={bulkQty}
                  onChange={(e) => setBulkQty(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  एकूण खरेदी किंमत (Total Lot Cost ₹): *
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="उदा. 20000"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            {/* Live Bulk Price per Unit Calculation Box */}
            <div style={{
              background: '#f4f8f5',
              border: '1px solid #c8e6c9',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#556b5c' }}>प्रति नग आपोआप निघालेला खरेदी दर (Unit Cost):</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#176b3a' }}>
                  ₹ {derivedUnitCost.toLocaleString('en-IN')} / {unit}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#27382d', marginBottom: '4px' }}>
                  विक्री दर निश्चित करा (Selling Price ₹):
                </label>
                <input
                  type="number"
                  placeholder={String(Math.round(derivedUnitCost * 1.15))}
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #176b3a', width: '140px', fontWeight: '700' }}
                />
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#556b5c' }}>अंदाजे नफा (Profit Margin):</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: derivedProfitMargin >= 0 ? '#137333' : '#b42318' }}>
                  +₹ {derivedProfitMargin} / {unit}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>नोंद / शेरा (Notes):</label>
              <textarea
                rows="2"
                placeholder="लॉट नंबर, बॅच नंबर किंवा इतर महत्त्वाची माहिती..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: '#176b3a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '13px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(23, 107, 58, 0.25)'
              }}
            >
              📥 खरेदी नोंद जतन करा व साठा वाढवा
            </button>
          </form>
        </div>
      )}

      {/* ---------------- TAB 3: PURCHASE LOTS HISTORY ---------------- */}
      {activeTab === 'lots' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e1e8e3',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f4f8f5', borderBottom: '2px solid #dbe6de', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>लॉट आयडी</th>
                  <th style={{ padding: '12px 14px' }}>तारीख</th>
                  <th style={{ padding: '12px 14px' }}>सप्लायर</th>
                  <th style={{ padding: '12px 14px' }}>उत्पादन</th>
                  <th style={{ padding: '12px 14px' }}>खरेदी संख्या</th>
                  <th style={{ padding: '12px 14px' }}>एकूण किंमत</th>
                  <th style={{ padding: '12px 14px' }}>प्रति नग दर</th>
                  <th style={{ padding: '12px 14px' }}>विक्री दर</th>
                </tr>
              </thead>
              <tbody>
                {purchaseLots.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#65776d' }}>
                      कोणतीही घाऊक खरेदी नोंद अद्याप झालेली नाही.
                    </td>
                  </tr>
                ) : (
                  purchaseLots.map((lot, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #edf2ee' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#176b3a' }}>{lot.lotId || `LOT-${idx + 1}`}</td>
                      <td style={{ padding: '12px 14px', color: '#555' }}>{lot.date}</td>
                      <td style={{ padding: '12px 14px', color: '#555' }}>{lot.supplier}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '700' }}>{lot.productName}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#137333' }}>
                        {lot.bulkQty} {lot.unit}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '700' }}>₹ {Number(lot.totalCost || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 14px', color: '#555' }}>₹ {Number(lot.unitCost || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 14px', color: '#176b3a', fontWeight: '700' }}>₹ {Number(lot.sellingPrice || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: '#fafbfa',
            borderTop: '1px solid #edf2ee',
            fontSize: '12px'
          }}>
            <div>एकूण खरेदी लॉट्स: {lotsTotal} (पान {lotsPage} / {lotsTotalPages})</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={lotsPage <= 1}
                onClick={() => setLotsPage(p => Math.max(1, p - 1))}
                style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
              >
                ◀ मागील १०
              </button>
              <button
                disabled={lotsPage >= lotsTotalPages}
                onClick={() => setLotsPage(p => Math.min(lotsTotalPages, p + 1))}
                style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
              >
                पुढील १० ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 4: LOW STOCK ALERTS ---------------- */}
      {activeTab === 'alerts' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e1e8e3',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', color: '#b42318', margin: '0 0 4px', fontWeight: '800' }}>
            ⚠️ कमी स्टॉक इशारा (Low Stock Alerts)
          </h2>
          <p style={{ fontSize: '13px', color: '#65776d', margin: '0 0 20px' }}>
            ज्या उत्पादनांचा साठा किमान पातळीपेक्षा (Min Alert Qty) कमी झाला आहे त्यांची यादी.
          </p>

          {lowStockList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#137333', background: '#e6f4ea', borderRadius: '12px' }}>
              ✓ सर्व उत्पादनांचा मुबलक साठा उपलब्ध आहे! सध्या कोणताही कमी स्टॉक अलर्ट नाही.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {lowStockList.map((item, idx) => (
                <div key={idx} style={{
                  border: '1px solid #fed7d7',
                  borderRadius: '12px',
                  padding: '14px',
                  background: '#fffaf0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#2d3748' }}>{item.name}</h4>
                    <span style={{ background: '#e53e3e', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                      कमी साठा!
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '8px' }}>
                    कॅटेगरी: {item.category}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#e53e3e' }}>
                      {item.availableStock} {item.unit}
                    </div>
                    <button
                      onClick={() => {
                        setProductName(item.name);
                        setCategory(item.category || 'खते (Fertilizers)');
                        setUnit(item.unit || 'नग');
                        setActiveTab('purchase');
                      }}
                      style={{
                        background: '#176b3a',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ➕ नवीन साठा मागवा
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#176b3a' }}>⚙️ साठा मॅन्युअल बदल (Stock Adjust)</h3>
              <button
                onClick={() => setAdjustItem(null)}
                style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#333' }}>
              उत्पादन: <strong>{adjustItem.name}</strong>
            </p>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#65776d' }}>
              सध्याचा शिल्लक साठा: <strong>{adjustItem.availableStock} {adjustItem.unit}</strong>
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                बदल संख्या (संख्या वाढवण्यासाठी +10, कमी करण्यासाठी -5 टाका):
              </label>
              <input
                type="number"
                placeholder="उदा. +10 किंवा -2"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>कारणाचे स्वरूप:</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
              >
                <option value="नवीन माल आला">नवीन माल आला (+)</option>
                <option value="नुकसानी किंवा गळती">नुकसानी किंवा गळती (-)</option>
                <option value="रिटर्न माल">रिटर्न माल (+)</option>
                <option value="दुकान ऑडिट / मोजदाद">दुकान ऑडिट / मोजदाद</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSaveAdjustment}
                style={{
                  flex: 1,
                  background: '#176b3a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                सेव्ह करा
              </button>
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                style={{
                  background: '#f0f0f0',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  cursor: 'pointer'
                }}
              >
                रद्द करा
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

