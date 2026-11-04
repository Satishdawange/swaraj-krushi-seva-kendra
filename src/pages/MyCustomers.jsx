import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchAllConsultancyCustomers,
  saveConsultancyCustomer,
  fetchAllShopCustomers,
  fetchAllBills,
  fetchRecentRecords,
  syncCustomersWithSheet,
  readStorage,
  STORAGE_KEYS,
  DEFAULT_SHOP_CUSTOMERS
} from '../service/googleSheetsService';
import { getShopInfo } from '../service/shopService';

function normalizeShopCustomerRow(row) {
  if (!row || typeof row !== 'object') return {};
  const name =
    row.Customer_Name ||
    row.customerName ||
    row.Name ||
    row.name ||
    row.Customer ||
    row.Farmer_Name ||
    row.farmerName ||
    'शेतकरी';

  const mobile = String(
    row.Mobile ||
    row.mobile ||
    row.Customer_Mobile ||
    row.Customer_Phone ||
    row.phone ||
    ''
  ).replace(/\D/g, '').slice(-10);

  const address =
    row.Address ||
    row.address ||
    row.Customer_Address ||
    row.Village ||
    row.गाव ||
    row.Place ||
    row.City ||
    '-';

  const totalBills = Number(row.Total_Bills || row.totalBills || row.billsCount || (row.bills ? row.bills.length : 1));
  const totalPurchased = Number(row.Total_Purchased || row.totalPurchased || row.totalAmount || row.Total_Amount || 0);
  const totalPaid = Number(row.Total_Paid || row.totalPaid || row.paidAmount || row.Paid_Amount || 0);
  const balanceUdhaari = Number(
    row.Balance_Udhaari ??
    row.balanceUdhaari ??
    row.Balance ??
    row.Udhaari ??
    (totalPurchased - totalPaid) ??
    0
  );
  const lastVisit = row.Last_Visit || row.lastVisit || row.Date || row.date || row.billDate || '-';

  return {
    ...row,
    name,
    mobile,
    address,
    totalBills,
    totalPurchased,
    totalPaid,
    balanceUdhaari,
    lastVisit
  };
}

export default function MyCustomers() {
  const [activeTab, setActiveTab] = useState('shop'); // default to 'shop' as requested
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  // Pagination states (10 customers per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Data lists - pre-seed shopCustomerList immediately from local cache or defaults
  const [consultancyList, setConsultancyList] = useState([]);
  const [shopCustomerList, setShopCustomerList] = useState(() => {
    const cached = readStorage(STORAGE_KEYS.CUSTOMERS, {});
    const vals = Object.values(cached || {});
    return (vals.length > 0 ? vals : DEFAULT_SHOP_CUSTOMERS).slice(0, 10).map(normalizeShopCustomerRow);
  });
  const [allBills, setAllBills] = useState([]);

  // Stats
  const [totalShopCount, setTotalShopCount] = useState(() => {
    const cached = readStorage(STORAGE_KEYS.CUSTOMERS, {});
    const vals = Object.values(cached || {});
    return vals.length > 0 ? vals.length : DEFAULT_SHOP_CUSTOMERS.length;
  });
  const [totalConsultancyCount, setTotalConsultancyCount] = useState(4);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopUdhaariOnly, setShopUdhaariOnly] = useState(false);

  // Modals
  const [editCustomerModal, setEditCustomerModal] = useState(null); // customer object or null
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [productsModalCustomer, setProductsModalCustomer] = useState(null);
  const [productsCropOnly, setProductsCropOnly] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');

  const shop = getShopInfo();
  const shopPhone = shop.phone || '8459568940';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Load paginated customers (10 per page) from Google Sheet / local cache
  const loadCustomersPage = async (page = 1, tab = activeTab, force = false) => {
    setPageLoading(true);
    try {
      const sheetName = tab === 'shop' ? 'Customers' : 'Consultancy_Customers';
      const [res, bills] = await Promise.all([
        fetchRecentRecords(sheetName, {
          page,
          limit: 10,
          search: searchQuery
        }).catch(() => ({ items: [], total: 0, totalPages: 1 })),
        (allBills.length === 0 || force) ? fetchAllBills(force).catch(() => []) : Promise.resolve(allBills)
      ]);

      if (Array.isArray(bills) && bills.length > 0) {
        setAllBills(bills);
      }

      const items = res.items || [];
      const totalRecords = Number(res.total) || items.length;
      const pagesCount = Math.max(1, Number(res.totalPages) || Math.ceil(totalRecords / 10) || 1);

      if (tab === 'shop') {
        let list = items.map(normalizeShopCustomerRow);
        // Fallback to local storage if page 1 returned empty
        if (list.length === 0 && page === 1 && !searchQuery) {
          const cached = readStorage(STORAGE_KEYS.CUSTOMERS, {});
          const vals = Object.values(cached || {});
          const source = vals.length > 0 ? vals : DEFAULT_SHOP_CUSTOMERS;
          list = source.slice(0, 10).map(normalizeShopCustomerRow);
          setTotalCount(source.length);
          setTotalPages(Math.max(1, Math.ceil(source.length / 10)));
          setTotalShopCount(source.length);
        } else {
          setTotalCount(totalRecords);
          setTotalPages(pagesCount);
          setTotalShopCount(totalRecords);
        }
        setShopCustomerList(list);
      } else {
        let list = items;
        // Fallback to local storage if page 1 returned empty
        if (list.length === 0 && page === 1 && !searchQuery) {
          const cached = readStorage(STORAGE_KEYS.CONSULTANCY_CUSTOMERS, []);
          if (Array.isArray(cached) && cached.length > 0) {
            list = cached.slice(0, 10);
            setTotalCount(cached.length);
            setTotalPages(Math.max(1, Math.ceil(cached.length / 10)));
            setTotalConsultancyCount(cached.length);
          } else {
            setTotalCount(totalRecords);
            setTotalPages(pagesCount);
            setTotalConsultancyCount(totalRecords);
          }
        } else {
          setTotalCount(totalRecords);
          setTotalPages(pagesCount);
          setTotalConsultancyCount(totalRecords);
        }
        setConsultancyList(list);
      }

      setCurrentPage(Number(res.page) || page);
    } catch (err) {
      console.error('Error loading customers page:', err);
    } finally {
      setPageLoading(false);
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !pageLoading) {
      const nextP = currentPage + 1;
      setCurrentPage(nextP);
      loadCustomersPage(nextP, activeTab);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !pageLoading) {
      const prevP = currentPage - 1;
      setCurrentPage(prevP);
      loadCustomersPage(prevP, activeTab);
    }
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setCurrentPage(1);
    setSearchQuery('');
    loadCustomersPage(1, newTab);
  };

  const loadData = async (force = false) => {
    await loadCustomersPage(1, activeTab, force);
  };

  const handleSyncFromSheet = async () => {
    try {
      showToast('बिलांवरून ग्राहक शोधून सिंक करत आहे...');
      const res = await syncCustomersWithSheet();
      if (res && res.count !== undefined) {
        showToast(`बिलांवरून ${res.count} ग्राहक यशस्वीरीत्या सिंक झाले!`);
      } else {
        showToast('ग्राहक सिंक प्रक्रिया पूर्ण झाली!');
      }
      await loadCustomersPage(1, activeTab, true);
    } catch (err) {
      showToast('सिंक करताना त्रुटी: ' + err.message);
    }
  };

  useEffect(() => {
    loadCustomersPage(1, activeTab);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomersPage(1, activeTab);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, shopUdhaariOnly, cropFilter, statusFilter]);

  // Filtered Consultancy Customers (for in-page filters)
  const filteredConsultancy = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return consultancyList.filter((c) => {
      const matchSearch =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.crop && c.crop.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      const matchCrop =
        cropFilter === 'all' ||
        (c.crop && c.crop.toLowerCase().includes(cropFilter.toLowerCase()));

      const matchStatus =
        statusFilter === 'all' ||
        (c.status && c.status.toLowerCase() === statusFilter.toLowerCase());

      return matchSearch && matchCrop && matchStatus;
    });
  }, [consultancyList, searchQuery, cropFilter, statusFilter]);

  // Filtered Shop Customers (for in-page filters)
  const filteredShopCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return shopCustomerList.filter((c) => {
      const matchSearch =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      const matchUdhaari = !shopUdhaariOnly || Number(c.balanceUdhaari || 0) > 0;

      return matchSearch && matchUdhaari;
    });
  }, [shopCustomerList, searchQuery, shopUdhaariOnly]);

  // Calculate KPIs
  const totalConsultancy = totalConsultancyCount;
  const activeConsultancy = consultancyList.filter((c) => (c.status || '').toLowerCase() === 'active').length;
  const totalShopCustomers = totalShopCount;
  const totalUdhaari = shopCustomerList.reduce((sum, c) => sum + (Number(c.balanceUdhaari) || 0), 0);

  // Handle Save Consultancy Customer (Add or Edit)
  const handleSaveConsultancyCustomer = async (e) => {
    e.preventDefault();
    if (!editCustomerModal.name || !editCustomerModal.mobile) {
      alert('कृपया शेतकऱ्याचे नाव व मोबाईल नंबर भरा.');
      return;
    }

    setIsSavingCustomer(true);
    try {
      await saveConsultancyCustomer(editCustomerModal);
      showToast(isNewCustomer ? 'नवीन कन्सल्टन्सी शेतकरी यशस्वीरित्या जोडला!' : 'कन्सल्टन्सी शेतकरी माहिती अपडेट केली!');
      setEditCustomerModal(null);
      await loadCustomersPage(1, 'consultancy', true);
    } catch (err) {
      alert('कन्सल्टन्सी शेतकरी सेव्ह करताना त्रुटी: ' + err.message);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Open used products modal for consultancy customer & refresh bills
  const handleOpenProductsModal = async (customer) => {
    setProductsModalCustomer(customer);
    setProductsCropOnly(false); // default to false so all products for this customer are visible
    try {
      const freshBills = await fetchAllBills(true);
      if (Array.isArray(freshBills) && freshBills.length > 0) {
        setAllBills(freshBills);
      }
    } catch (err) {
      console.warn('Error refreshing bills for customer products:', err);
    }
  };

  // Products purchased by selected consultancy customer
  const customerProductsData = useMemo(() => {
    if (!productsModalCustomer) return { items: [], totalSpend: 0, billsCount: 0 };

    const cleanPhone = (p) => String(p || '').replace(/\D/g, '').slice(-10);
    const cMobile = cleanPhone(productsModalCustomer.mobile || productsModalCustomer.phone);
    const cName = String(productsModalCustomer.name || '').trim().toLowerCase();
    const cId = String(productsModalCustomer.id || '').trim().toLowerCase();

    // Match bills belonging to this customer
    const matchingBills = allBills.filter((b) => {
      const bMobile = cleanPhone(
        b.customerMobile ||
        b.mobile ||
        b.Customer_Mobile ||
        b.Customer_Phone ||
        b.phone ||
        ''
      );
      const bName = String(
        b.customerName ||
        b.Customer_Name ||
        b.name ||
        ''
      ).trim().toLowerCase();
      const bId = String(b.customerId || b.consultancyCustomerId || '').trim().toLowerCase();

      // Mobile match (last 10 digits match)
      const isMobileMatch = Boolean(cMobile && bMobile && cMobile === bMobile);

      // Name match: exact or substring match if name >= 3 characters
      const isNameMatch = Boolean(
        cName && bName && (
          cName === bName ||
          (cName.length >= 3 && bName.includes(cName)) ||
          (bName.length >= 3 && cName.includes(bName))
        )
      );

      // ID match
      const isIdMatch = Boolean(cId && bId && cId === bId);

      return isMobileMatch || isNameMatch || isIdMatch;
    });

    const productsList = [];
    let totalSpend = 0;

    matchingBills.forEach((bill) => {
      const billCrop = String(bill.consultancyCrop || bill.Consultancy_Crop || bill.crop || '').toLowerCase().trim();
      const cCrop = String(productsModalCustomer.crop || '').toLowerCase().trim();

      const cleanCrop = (str) => str.replace(/[^a-z0-9\u0900-\u097F]/g, '');
      const billCropClean = cleanCrop(billCrop);
      const cCropClean = cleanCrop(cCrop);

      const isCropMatch =
        !productsCropOnly ||
        !cCropClean ||
        !billCropClean ||
        billCropClean === 'इतर' ||
        cCropClean === 'इतर' ||
        billCropClean.includes(cCropClean) ||
        cCropClean.includes(billCropClean);

      if (isCropMatch) {
        let items = Array.isArray(bill.items) ? bill.items : [];
        if (items.length === 0 && typeof bill.items === 'string') {
          try {
            items = JSON.parse(bill.items);
          } catch {}
        }
        if (items.length === 0 && bill.Items_JSON) {
          try {
            items = typeof bill.Items_JSON === 'string' ? JSON.parse(bill.Items_JSON) : bill.Items_JSON;
          } catch {}
        }

        items.forEach((item) => {
          const qty = Number(item.qty ?? item.quantity ?? 1);
          const price = Number(item.price ?? item.rate ?? 0);
          const itemTotal = Number(item.total ?? item.itemTotal ?? qty * price);
          totalSpend += itemTotal;

          productsList.push({
            billNo: bill.billNo || bill.billBookBillNo || bill.billId || 'BILL',
            date: bill.billDate || bill.date || bill.createdAt || '',
            productName: item.name || item.productName || item.Name || 'उत्पादन',
            category: item.category || 'कृषी औषधे/खते',
            quantity: qty,
            unit: item.unit || 'नग',
            price: price,
            total: itemTotal,
            crop: bill.consultancyCrop || bill.Consultancy_Crop || productsModalCustomer.crop || 'लागू'
          });
        });
      }
    });

    return {
      items: productsList,
      totalSpend,
      billsCount: matchingBills.length
    };
  }, [productsModalCustomer, allBills, productsCropOnly]);

  return (
    <div className="admin-container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#123e26',
            color: '#b9dc68',
            padding: '14px 22px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '14px',
            border: '1px solid #2a613d',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <span style={{ background: '#eaf6ee', color: '#176b3a', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>
            🌾 ग्राहक व्यवस्थापन (Customer Portal)
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#17221b', margin: '8px 0 4px' }}>
            माझे ग्राहक (My Customers)
          </h1>
          <p style={{ color: '#66736b', fontSize: '14px', margin: 0 }}>
            कन्सल्टन्सी शेतकरी आणि दुकानाचे सर्व ग्राहक, त्यांची खरेदी व वापरलेल्या औषधांचा तपशील.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncFromSheet}
            style={{
              background: '#1b6336',
              border: 'none',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="गुगल शीटमधील सर्व बिलांवरून ग्राहक तयार करा"
          >
            <span>👥</span>
            <span>बिलांवरून ग्राहक सिंक करा</span>
          </button>
          <button
            onClick={() => loadData()}
            style={{
              background: '#fff',
              border: '1px solid #cad8cd',
              color: '#176b3a',
              padding: '10px 16px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🔄 रिफ्रेश
          </button>
          {activeTab === 'consultancy' && (
            <button
              onClick={() => {
                setIsNewCustomer(true);
                setEditCustomerModal({
                  id: '',
                  name: '',
                  mobile: '',
                  crop: 'द्राक्ष (Grapes)',
                  areaAcres: '1',
                  address: '',
                  status: 'Active',
                  notes: '',
                  startDate: new Date().toISOString().split('T')[0]
                });
              }}
              style={{
                background: '#176b3a',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(23,107,58,0.2)'
              }}
            >
              <span>➕ नवीन कन्सल्टन्सी शेतकरी</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '24px'
        }}
      >
        <div style={{ background: '#fff', border: '1px solid #dfe8e0', borderRadius: '16px', padding: '16px 20px' }}>
          <span style={{ fontSize: '12px', color: '#66736b', fontWeight: 600 }}>एकूण कन्सल्टन्सी शेतकरी</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#176b3a', marginTop: '4px' }}>
            {totalConsultancy} <span style={{ fontSize: '13px', color: '#27ae60' }}>({activeConsultancy} सक्रिय)</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #dfe8e0', borderRadius: '16px', padding: '16px 20px' }}>
          <span style={{ fontSize: '12px', color: '#66736b', fontWeight: 600 }}>दुकानाचे एकूण ग्राहक</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2c3e50', marginTop: '4px' }}>
            {totalShopCustomers} <span style={{ fontSize: '13px', color: '#66736b' }}>शेतकरी</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #dfe8e0', borderRadius: '16px', padding: '16px 20px' }}>
          <span style={{ fontSize: '12px', color: '#66736b', fontWeight: 600 }}>एकूण नोंदवलेली बिले</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#17221b', marginTop: '4px' }}>
            {allBills.length} <span style={{ fontSize: '13px', color: '#66736b' }}>बिले</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #dfe8e0', borderRadius: '16px', padding: '16px 20px' }}>
          <span style={{ fontSize: '12px', color: '#c0392b', fontWeight: 600 }}>बाकी उधारी (Pending Balance)</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#c0392b', marginTop: '4px' }}>
            ₹{totalUdhaari.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '2px solid #dfe8e0',
          marginBottom: '20px'
        }}
      >
        <button
          onClick={() => handleTabChange('shop')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'shop' ? '3px solid #176b3a' : '3px solid transparent',
            color: activeTab === 'shop' ? '#176b3a' : '#66736b',
            fontWeight: 800,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🛒 दुकानाचे ग्राहक (My Shop Customers)</span>
          <span
            style={{
              background: activeTab === 'shop' ? '#eaf6ee' : '#f0f3f1',
              color: activeTab === 'shop' ? '#176b3a' : '#66736b',
              padding: '2px 8px',
              borderRadius: '99px',
              fontSize: '12px'
            }}
          >
            {totalShopCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('consultancy')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'consultancy' ? '3px solid #176b3a' : '3px solid transparent',
            color: activeTab === 'consultancy' ? '#176b3a' : '#66736b',
            fontWeight: 800,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🌱 कन्सल्टन्सी ग्राहक (My Consultancy Customers)</span>
          <span
            style={{
              background: activeTab === 'consultancy' ? '#eaf6ee' : '#f0f3f1',
              color: activeTab === 'consultancy' ? '#176b3a' : '#66736b',
              padding: '2px 8px',
              borderRadius: '99px',
              fontSize: '12px'
            }}
          >
            {totalConsultancyCount}
          </span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              showToast('माहिती रीफ्रेश करत आहे...');
              loadData(true);
            }}
            style={{
              background: '#f0fbf4',
              color: '#176b3a',
              border: '1px solid #c2e2cb',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Google Sheets वरून ताजी माहिती आणा"
          >
            <span>🔄</span>
            <span>माहिती रीफ्रेश करा</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #dfe8e0',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >
        <div style={{ flex: '1 1 250px' }}>
          <input
            type="text"
            placeholder={
              activeTab === 'consultancy'
                ? '🔍 शेतकरी नाव, मोबाईल नंबर किंवा पीक शोधा...'
                : '🔍 ग्राहक नाव किंवा मोबाईल नंबर शोधा...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cad8cd',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        {activeTab === 'consultancy' && (
          <>
            <div>
              <select
                value={cropFilter}
                onChange={(e) => setCropFilter(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cad8cd',
                  fontSize: '13px',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="all">सर्व पिके (All Crops)</option>
                <option value="द्राक्ष">द्राक्ष (Grapes)</option>
                <option value="टोमॅटो">टोमॅटो (Tomato)</option>
                <option value="डाळिंब">डाळिंब (Pomegranate)</option>
                <option value="कलिंगड">कलिंगड (Watermelon)</option>
                <option value="इतर">इतर (Other)</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cad8cd',
                  fontSize: '13px',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="all">सर्व स्थिती (All Status)</option>
                <option value="Active">फक्त सक्रिय (Active)</option>
                <option value="Inactive">निष्क्रिय (Inactive)</option>
              </select>
            </div>
          </>
        )}

        {activeTab === 'shop' && (
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#c0392b',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={shopUdhaariOnly}
                onChange={(e) => setShopUdhaariOnly(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>फक्त बाकी उधारी असलेले ग्राहक (Udhaari Only)</span>
            </label>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#66736b', fontSize: '16px' }}>
          माहिती लोड होत आहे, कृपया थांबा...
        </div>
      ) : activeTab === 'consultancy' ? (
        /* ========================================================
            TAB 1: CONSULTANCY CUSTOMERS TABLE
        ========================================================= */
        <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #dfe8e0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fbf9', borderBottom: '1px solid #dfe8e0', color: '#526258' }}>
                  <th style={{ padding: '14px 16px' }}>शेतकरी नाव</th>
                  <th style={{ padding: '14px 16px' }}>मोबाईल</th>
                  <th style={{ padding: '14px 16px' }}>पीक (Crop)</th>
                  <th style={{ padding: '14px 16px' }}>क्षेत्र (एकरी)</th>
                  <th style={{ padding: '14px 16px' }}>पत्ता</th>
                  <th style={{ padding: '14px 16px' }}>स्थिती</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>वापरलेली उत्पादने</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>कृती</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsultancy.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#66736b' }}>
                      कोणतेही कन्सल्टन्सी शेतकरी आढळले नाहीत.
                    </td>
                  </tr>
                ) : (
                  filteredConsultancy.map((customer) => (
                    <tr
                      key={customer.id || customer.mobile}
                      style={{ borderBottom: '1px solid #f0f4f1', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafdfb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#17221b' }}>
                        <div>{customer.name}</div>
                        {customer.notes && (
                          <small style={{ color: '#88998e', display: 'block', fontWeight: 400, marginTop: '2px' }}>
                            {customer.notes}
                          </small>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <a
                          href={`tel:${customer.mobile}`}
                          style={{ color: '#176b3a', textDecoration: 'none', fontWeight: 600 }}
                        >
                          📞 {customer.mobile}
                        </a>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            background: '#eaf6ee',
                            color: '#176b3a',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '99px',
                            fontSize: '12px'
                          }}
                        >
                          {customer.crop}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>{customer.areaAcres || '1'} एकर</td>
                      <td style={{ padding: '14px 16px', color: '#55665c', maxWidth: '200px' }}>
                        {customer.address || '-'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            background: (customer.status || '').toLowerCase() === 'active' ? '#e8f8ec' : '#fcedea',
                            color: (customer.status || '').toLowerCase() === 'active' ? '#176b3a' : '#c0392b',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px'
                          }}
                        >
                          {(customer.status || '').toLowerCase() === 'active' ? '● सक्रिय' : '○ निष्क्रिय'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenProductsModal(customer)}
                          style={{
                            background: '#176b3a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '7px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 6px rgba(23,107,58,0.15)'
                          }}
                        >
                          <span>📦</span>
                          <span>वापरलेली उत्पादने पाहा</span>
                        </button>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <a
                            href={`https://wa.me/91${customer.mobile}?text=${encodeURIComponent(
                              `नमस्कार ${customer.name} जी, स्वराज कृषी सेवा केंद्रामधून आपल्या ${customer.crop} कन्सल्टन्सी संदर्भात संपर्क करत आहोत.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: '#e8f8ec',
                              color: '#27ae60',
                              border: '1px solid #ccebd3',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                            title="WhatsApp मेसेज"
                          >
                            💬
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewCustomer(false);
                              setEditCustomerModal({ ...customer });
                            }}
                            style={{
                              background: '#f4f6f5',
                              border: '1px solid #dfe5e1',
                              color: '#34495e',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ संपादन
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================
            TAB 2: SHOP CUSTOMERS TABLE
        ========================================================= */
        <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #dfe8e0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fbf9', borderBottom: '1px solid #dfe8e0', color: '#526258' }}>
                  <th style={{ padding: '14px 16px' }}>ग्राहक नाव</th>
                  <th style={{ padding: '14px 16px' }}>मोबाईल</th>
                  <th style={{ padding: '14px 16px' }}>पत्ता</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>एकूण बिले</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>एकूण खरेदी</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>जमा रक्कम</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>बाकी उधारी</th>
                  <th style={{ padding: '14px 16px' }}>शेवटची खरेदी</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>कृती</th>
                </tr>
              </thead>
              <tbody>
                {filteredShopCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#66736b' }}>
                      कोणतेही खरेदीदार ग्राहक आढळले नाहीत.
                    </td>
                  </tr>
                ) : (
                  filteredShopCustomers.map((cust, idx) => {
                    const balance = Number(cust.balanceUdhaari) || 0;
                    return (
                      <tr
                        key={cust.mobile || cust.name || ('sc_' + idx)}
                        style={{ borderBottom: '1px solid #f0f4f1', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fafdfb')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#17221b' }}>
                          {cust.name}
                        </td>
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          {cust.mobile ? (
                            <a href={`tel:${cust.mobile}`} style={{ color: '#176b3a', textDecoration: 'none', fontWeight: 600 }}>
                              📞 {cust.mobile}
                            </a>
                          ) : (
                            <span style={{ color: '#95a5a6' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#55665c', maxWidth: '200px' }}>
                          {cust.address || '-'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>
                          {cust.totalBills || 1}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#17221b' }}>
                          ₹{Number(cust.totalPurchased || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#27ae60', fontWeight: 600 }}>
                          ₹{Number(cust.totalPaid || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800 }}>
                          <span
                            style={{
                              color: balance > 0 ? '#c0392b' : '#27ae60',
                              background: balance > 0 ? '#fcedea' : '#e8f8ec',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            ₹{balance.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#66736b', whiteSpace: 'nowrap' }}>
                          {cust.lastVisit || '-'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            {balance > 0 && (
                              <a
                                href={`https://wa.me/91${cust.mobile}?text=${encodeURIComponent(
                                  `नमस्कार ${cust.name} जी, स्वराज कृषी सेवा केंद्रामधून आपले ₹${balance} चे उधारी बिल बाकी आहे. कृपया लवकरात लवकर भरणा करावा. धन्यवाद! - स्वराज कृषी सेवा केंद्र, चांदवड (संपर्क: ${shopPhone})`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  background: '#c0392b',
                                  color: '#fff',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="WhatsApp उधारी मेसेज"
                              >
                                <span>💬</span>
                                <span>उधारी तगादा</span>
                              </a>
                            )}
                            <a
                              href={`/admin/bills?search=${cust.mobile}`}
                              style={{
                                background: '#f4f6f5',
                                border: '1px solid #dfe5e1',
                                color: '#176b3a',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                textDecoration: 'none'
                              }}
                              title="बिले पाहा"
                            >
                              📋 बिले
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls Bar (Max 10 per page on mobile/desktop, fetches next 10 on click) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dfe8e0',
          marginTop: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ fontSize: '13px', color: '#55665c', fontWeight: 600 }}>
          पान <b>{currentPage}</b> / <b>{totalPages}</b> (एकूण <b>{totalCount}</b> ग्राहक • दर पानावर १० ग्राहक)
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || pageLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1.5px solid #cadbcf',
              background: currentPage <= 1 ? '#f3f6f4' : '#ffffff',
              color: currentPage <= 1 ? '#95a5a6' : '#176b3a',
              fontWeight: 700,
              fontSize: '13px',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ← मागील (Prev 10)
          </button>

          <span
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#eaf6ee',
              color: '#176b3a',
              fontWeight: 800,
              fontSize: '13px'
            }}
          >
            {currentPage}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || pageLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1.5px solid #cadbcf',
              background: currentPage >= totalPages ? '#f3f6f4' : '#176b3a',
              color: currentPage >= totalPages ? '#95a5a6' : '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              boxShadow: currentPage >= totalPages ? 'none' : '0 2px 8px rgba(23,107,58,0.2)',
              transition: 'all 0.2s'
            }}
          >
            {pageLoading ? 'लोड होत आहे...' : 'पुढील (Next 10) →'}
          </button>
        </div>
      </div>

      {/* ========================================================
          PRODUCTS USED MODAL (for Consultancy Customer)
      ========================================================= */}
      {productsModalCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 19, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setProductsModalCustomer(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '24px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              padding: '28px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eef2ef', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ background: '#eaf6ee', color: '#176b3a', padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>
                  🌱 कन्सल्टन्सी पीक वापर
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#17221b', margin: '6px 0 2px' }}>
                  {productsModalCustomer.name} - वापरलेली उत्पादने
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#66736b' }}>
                  पीक: <b>{productsModalCustomer.crop}</b> | मोबाईल: <b>{productsModalCustomer.mobile}</b> | क्षेत्र: <b>{productsModalCustomer.areaAcres || '1'} एकर</b>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProductsModalCustomer(null)}
                style={{
                  background: '#f0f3f1',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#425449'
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Stats & Filter Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: '#f8fbf9', border: '1px solid #d5e7d9', borderRadius: '12px', padding: '10px 16px' }}>
                  <small style={{ color: '#66736b', display: 'block', fontSize: '11px' }}>एकूण उत्पादने</small>
                  <strong style={{ fontSize: '18px', color: '#176b3a' }}>{customerProductsData.items.length}</strong>
                </div>
                <div style={{ background: '#f8fbf9', border: '1px solid #d5e7d9', borderRadius: '12px', padding: '10px 16px' }}>
                  <small style={{ color: '#66736b', display: 'block', fontSize: '11px' }}>संबंधित बिले</small>
                  <strong style={{ fontSize: '18px', color: '#2c3e50' }}>{customerProductsData.billsCount}</strong>
                </div>
                <div style={{ background: '#f8fbf9', border: '1px solid #d5e7d9', borderRadius: '12px', padding: '10px 16px' }}>
                  <small style={{ color: '#66736b', display: 'block', fontSize: '11px' }}>एकूण खर्च रक्कम</small>
                  <strong style={{ fontSize: '18px', color: '#176b3a' }}>₹{customerProductsData.totalSpend.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#176b3a', fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productsCropOnly}
                    onChange={(e) => setProductsCropOnly(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>फक्त {productsModalCustomer.crop} पिकासाठी घेतलेली उत्पादने दाखवा</span>
                </label>
              </div>
            </div>

            {/* Products Table */}
            {customerProductsData.items.length === 0 ? (
              <div
                style={{
                  background: '#f9fbf9',
                  border: '1px dashed #c0d8c4',
                  borderRadius: '16px',
                  padding: '36px',
                  textAlign: 'center',
                  color: '#66736b'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                <h4 style={{ margin: '0 0 6px', color: '#17221b', fontSize: '15px' }}>
                  या शेतकऱ्यासाठी अद्याप कोणतीही उत्पादने नोंदवली नाहीत
                </h4>
                <p style={{ margin: 0, fontSize: '13px', maxWidth: '480px', marginInline: 'auto' }}>
                  बिल तयार करताना <b>"कन्सल्टन्सी सेवा ग्राहक आहे का?"</b> हा पर्याय निवडून या ग्राहकाचे नाव व पीक निवडल्यास, बिलमधील सर्व उत्पादने येथे आपोआप ट्रॅक होतील.
                </p>
              </div>
            ) : (
              <div style={{ border: '1px solid #dfe8e0', borderRadius: '14px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f5f9f6', borderBottom: '1px solid #dfe8e0', color: '#526258' }}>
                      <th style={{ padding: '10px 14px' }}>बिल क्र.</th>
                      <th style={{ padding: '10px 14px' }}>तारीख</th>
                      <th style={{ padding: '10px 14px' }}>उत्पादनाचे नाव</th>
                      <th style={{ padding: '10px 14px' }}>श्रेणी</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>प्रमाण</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>दर (₹)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>एकूण (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerProductsData.items.map((prod, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0f4f1' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#176b3a' }}>{prod.billNo}</td>
                        <td style={{ padding: '10px 14px', color: '#66736b', whiteSpace: 'nowrap' }}>{prod.date}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#17221b' }}>{prod.productName}</td>
                        <td style={{ padding: '10px 14px', color: '#526258', fontSize: '12px' }}>{prod.category}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>
                          {prod.quantity} {prod.unit}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>₹{prod.price}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#17221b' }}>
                          ₹{prod.total.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setProductsModalCustomer(null)}
                style={{
                  background: '#176b3a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 22px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD / EDIT CONSULTANCY CUSTOMER MODAL
      ========================================================= */}
      {editCustomerModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 19, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setEditCustomerModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              padding: '28px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eef2ef', paddingBottom: '14px', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#17221b' }}>
                {isNewCustomer ? '➕ नवीन कन्सल्टन्सी शेतकरी जोडा' : '✏️ कन्सल्टन्सी शेतकरी माहिती संपादन'}
              </h3>
              <button
                type="button"
                onClick={() => setEditCustomerModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#66736b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConsultancyCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334139', marginBottom: '4px' }}>
                  शेतकऱ्याचे पूर्ण नाव *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. रमेश सखाराम पाटील"
                  value={editCustomerModal.name || ''}
                  onChange={(e) => setEditCustomerModal({ ...editCustomerModal, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cad8cd', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334139', marginBottom: '4px' }}>
                    मोबाईल नंबर *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="उदा. 9822334455"
                    value={editCustomerModal.mobile || ''}
                    onChange={(e) => setEditCustomerModal({ ...editCustomerModal, mobile: e.target.value.replace(/\D/g, '') })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cad8cd', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334139', marginBottom: '4px' }}>
                    कन्सल्टन्सी पीक (Crop) *
                  </label>
                  <select
                    value={editCustomerModal.crop || 'द्राक्ष (Grapes)'}
                    onChange={(e) => setEditCustomerModal({ ...editCustomerModal, crop: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cad8cd', fontSize: '14px', background: '#fff' }}
                  >
                    <option value="द्राक्ष (Grapes)">द्राक्ष (Grapes)</option>
                    <option value="टोमॅटो (Tomato)">टोमॅटो (Tomato)</option>
                    <option value="डाळिंब (Pomegranate)">डाळिंब (Pomegranate)</option>
                    <option value="कलिंगड (Watermelon)">कलिंगड (Watermelon)</option>
                    <option value="कांदा (Onion)">कांदा (Onion)</option>
                    <option value="ऊस (Sugarcane)">ऊस (Sugarcane)</option>
                    <option value="इतर पीक (Other)">इतर पीक (Other)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334139', marginBottom: '4px' }}>
                    क्षेत्र (एकरामध्ये)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. 2.5"
                    value={editCustomerModal.areaAcres || ''}
                    onChange={(e) => setEditCustomerModal({ ...editCustomerModal, areaAcres: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cad8cd', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334139', marginBottom: '4px' }}>
                    स्थिती (Status)
                  </label>
                  <select
                    value={editCustomerModal.status || 'Active'}
                    onChange={(e) => setEditCustomerModal({ ...editCustomerModal, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cad8cd', fontSize: '14px', background: '#fff' }}
                  >
                    <option value="Active">सक्रिय (Active)</option>
                    <option value="Inactive">निष्क्रिय (Inactive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334139', marginBottom: '4px' }}>
                  पत्ता / गाव
                </label>
                <input
                  type="text"
                  placeholder="उदा. मु. पो. कानमंडाळे, ता. चांदवड"
                  value={editCustomerModal.address || ''}
                  onChange={(e) => setEditCustomerModal({ ...editCustomerModal, address: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cad8cd', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334139', marginBottom: '4px' }}>
                  टीप / पीक शेरा (Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="उदा. ऑक्टोबर छाटणी, डाऊनी प्रतिबंधक शेड्यूल चालू आहे..."
                  value={editCustomerModal.notes || ''}
                  onChange={(e) => setEditCustomerModal({ ...editCustomerModal, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cad8cd', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  style={{
                    flex: 1,
                    background: '#176b3a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: isSavingCustomer ? 'not-allowed' : 'pointer',
                    opacity: isSavingCustomer ? 0.65 : 1
                  }}
                >
                  {isSavingCustomer ? '⏳ शीटमध्ये सेव्ह होत आहे...' : '✓ सेव्ह करा'}
                </button>
                <button
                  type="button"
                  disabled={isSavingCustomer}
                  onClick={() => setEditCustomerModal(null)}
                  style={{
                    background: '#f0f3f1',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isSavingCustomer ? 'not-allowed' : 'pointer',
                    opacity: isSavingCustomer ? 0.65 : 1
                  }}
                >
                  रद्द करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

