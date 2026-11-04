/**
 * Google Apps Script Backend Code for Swaraj Krushi Seva Kendra
 * 
 * This script is deployed as a Web App inside Google Sheets.
 * It provides a RESTful API for:
 * - Products & Categories
 * - Inventory & Bulk Purchase Lots
 * - Bills & Invoices (with live inventory deduction)
 * - Delivery Challans
 * - Customer Directory & Udhaari Khata
 * - Users & Auth
 * - High-speed pagination (10 records at a time) and Stats caching
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==========================================================================
 * SWARAJ KRUSHI SEVA KENDRA - GOOGLE APPS SCRIPT WEB APP API
 * कानमंडाळे, ता. चांदवड, जि. नाशिक
 * ==========================================================================
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click "Extensions" -> "Apps Script".
 * 3. Replace all code in the script editor with this complete script.
 * 4. Click "Deploy" -> "New deployment".
 * 5. Select type: "Web app".
 *    - Description: "Swaraj KSK API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 6. Click "Deploy", grant permissions, and copy the Web App URL.
 * 7. Paste the Web App URL into Swaraj KSK Admin -> "Google Sheets Integration".
 */

const TABS = {
  STATS: 'Stats',
  INVENTORY: 'Inventory',
  PURCHASES: 'Purchase_Lots',
  BILLS: 'Bills',
  CHALLANS: 'Challans',
  CUSTOMERS: 'Customers',
  USERS: 'Users',
  SETTINGS: 'Settings',
  PRODUCTS: 'Products',
  CATEGORIES: 'Categories',
  SERVICES: 'Services',
  CONSULTANCY_CUSTOMERS: 'Consultancy_Customers',
  PRODUCT_REQUESTS: 'Product_Requests',
  AUTH_SESSIONS: 'Auth_Sessions'
};
const API_VERSION = 'sksk-customer-portal-v11 (upgraded from sksk-customer-portal-v10)';

function isBillsSheetName(sheetName) {
  return sheetName === TABS.BILLS || /^Bills_[0-9]{4}_[0-9]{2}$/i.test(String(sheetName || '')) || /^Bill+s?[_\s-][0-9]{4}[_\s-][0-9]{2}$/i.test(String(sheetName || ''));
}



function findCustomersSheet(ss) {
  if (!ss) return null;
  const direct = ss.getSheetByName(TABS.CUSTOMERS);
  if (direct) return direct;
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const sName = sheets[i].getName();
    const clean = sName.trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (clean === 'customers' || clean === 'customer' || clean === 'shopcustomers' || clean === 'ग्राहक') {
      return sheets[i];
    }
  }
  return null;
}

function ensureAllBillsHeaders(ss) {
  try {
    const allSheets = ss.getSheets();
    allSheets.forEach(function(sh) {
      if (isBillsSheetName(sh.getName())) {
        ensureHeader(sh, 'Billbook_Bill_No');
        ensureHeader(sh, 'Is_Consultancy_Customer');
        ensureHeader(sh, 'Consultancy_Crop');
      }
    });
    ['Bills_2026_10', 'Bills_2026_11'].forEach(function(name) {
      const sh = ss.getSheetByName(name);
      if (sh) {
        ensureHeader(sh, 'Billbook_Bill_No');
        ensureHeader(sh, 'Is_Consultancy_Customer');
        ensureHeader(sh, 'Consultancy_Crop');
      }
    });
  } catch (err) {}
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    let params = {};
    if (e.parameter) {
      params = Object.assign(params, e.parameter);
    }
    
    let postData = null;
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
        params = Object.assign(params, postData);
      } catch (err) {
        // Form post or raw string
      }
    }
    
    const action = params.action || 'ping';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureAllBillsHeaders(ss);
    
    let result = { success: false, error: 'Unknown action' };
    
    switch (action) {
      case 'ping':
        try {
          if (!ss.getSheetByName(TABS.CUSTOMERS) || ss.getSheetByName(TABS.CUSTOMERS).getLastRow() <= 1) {
            syncCustomersFromBills(ss);
          }
          if (!ss.getSheetByName(TABS.SERVICES) || ss.getSheetByName(TABS.SERVICES).getLastRow() <= 1) {
            seedDefaultServices(ss);
          }
          if (!ss.getSheetByName(TABS.CONSULTANCY_CUSTOMERS) || ss.getSheetByName(TABS.CONSULTANCY_CUSTOMERS).getLastRow() <= 1) {
            syncConsultancyCustomersFromBills(ss);
          }
        } catch (e) {}
        result = {
          success: true,
          message: 'Swaraj KSK Google Sheets API is Online',
          apiVersion: API_VERSION,
          timestamp: new Date().toISOString(),
          sheetName: ss.getName()
        };
        break;

      case 'syncCustomers':
        result = syncCustomersFromBills(ss);
        break;
        
      case 'initTabs':
        result = initAllTabs(ss);
        break;
        
      case 'getStats':
        result = requireStaffOrAdmin(ss, params.token).success
          ? getStats(ss)
          : requireStaffOrAdmin(ss, params.token);
        break;

      case 'getDashboardMetrics':
        const dashboardAccess = requireStaffOrAdmin(ss, params.token);
        result = dashboardAccess.success
          ? getDashboardMetricsForRange(ss, params)
          : dashboardAccess;
        break;
        
      case 'getRecent':
        const recentSheet = params.sheetName || TABS.BILLS;
        const recentSession = validateAuthSession(ss, params.token);
        const recentUser = recentSession.valid ? recentSession.user : null;
        const recentIsAdmin = recentUser?.role === 'admin';
        const recentIsStaff = recentUser?.role === 'staff';
        const recentNeedsStaff = isBillsSheetName(recentSheet);
        if (recentNeedsStaff && recentSession.valid && !recentIsAdmin && !recentIsStaff && recentUser && recentUser.role === 'blocked') {
          result = { success: false, error: 'Sign in is required to access these records.' };
        } else {
          result = getRecentPaginated(ss, recentSheet, parseInt(params.page || 1), parseInt(params.limit || 10), params.search || '', params.category || '');
          if (result.success && recentSheet === TABS.INVENTORY && !recentIsAdmin) {
            result.data = result.data.map(recentIsStaff ? inventoryWithoutPricingRecord : publicInventoryRecord);
          }
          if (result.success && recentSheet === TABS.PRODUCTS && !recentIsAdmin) {
            result.data = result.data.map(publicProductRecord);
          }
        }
        break;

      case 'getMyBills':
        result = getBillsForCustomer(ss, params.token);
        break;
        
      case 'getAll':
        const allSheet = params.sheetName || TABS.INVENTORY;
        const allSession = validateAuthSession(ss, params.token);
        const allUser = allSession.valid ? allSession.user : null;
        const allIsAdmin = allUser?.role === 'admin';
        const allIsStaff = allUser?.role === 'staff';
        if ((isBillsSheetName(allSheet) || ['Customers', 'Purchase_Lots', 'Challans', 'Stats'].includes(allSheet)) && allSession.valid && !allIsAdmin && !allIsStaff && allUser && allUser.role === 'blocked') {
          result = { success: false, error: 'Sign in is required to access these records.' };
        } else {
          result = getAllRecords(ss, allSheet);
          if (result.success && allSheet === TABS.INVENTORY && !allIsAdmin) {
            result.data = result.data.map(allIsStaff ? inventoryWithoutPricingRecord : publicInventoryRecord);
          }
          if (result.success && allSheet === TABS.PRODUCTS && !allIsAdmin) {
            result.data = result.data.map(publicProductRecord);
          }
        }
        break;
        
      case 'saveBill':
        result = saveBillRecord(ss, params.data);
        break;
        
      case 'saveChallan':
        result = saveChallanRecord(ss, params.data);
        break;
        
      case 'saveInventoryItem':
        result = saveInventoryItem(ss, params.data);
        break;

      case 'submitProductRequest':
        result = saveProductRequest(ss, params.data || {});
        break;

      case 'savePurchaseLot':
        result = savePurchaseLot(ss, params.data);
        break;
        
      case 'adjustStock':
        result = adjustStock(ss, params.id, params.delta, params.reason);
        break;
        
      case 'login':
        result = authenticateUser(ss, params.username, params.password);
        break;

      case 'validateSession':
        result = validateAuthSession(ss, params.token);
        break;

      case 'logout':
        result = revokeAuthSession(ss, params.token);
        break;

      case 'changePassword':
        result = changeUserPassword(ss, params.token, params.currentPassword, params.newPassword);
        break;
        
      case 'ensureUser':
        result = (function() {
          if (!params.data) return { success: false, error: 'No user data' };
          const m = params.data.mobile || params.data.username || params.data.id;
          ensureCustomerUser(ss, m, params.data.fullName || params.data.customerName || 'ग्राहक');
          return { success: true };
        })();
        break;

      case 'updateSetting':
        result = (function() {
          if (!params.data || !params.data.key) return { success: false, error: 'Key required' };
          let setSheet = ss.getSheetByName(TABS.SETTINGS);
          if (!setSheet) { initAllTabs(ss); setSheet = ss.getSheetByName(TABS.SETTINGS); }
          const k = String(params.data.key).trim();
          const v = String(params.data.value ?? '').trim();
          const lr = setSheet.getLastRow();
          if (lr > 1) {
            const allK = setSheet.getRange(2, 1, lr - 1, 1).getValues().map(r => String(r[0]).trim().toLowerCase());
            const idx = allK.indexOf(k.toLowerCase());
            if (idx !== -1) {
              setSheet.getRange(idx + 2, 2).setValue(v);
              return { success: true, updated: true };
            }
          }
          setSheet.appendRow([k, v, params.data.description || '']);
          return { success: true, inserted: true };
        })();
        break;
        
      case 'saveCategory':
        result = (function() {
          if (!params.data || (!params.data.id && !params.data.Category_ID && !params.data.name && !params.data.Name_MR)) {
            return { success: false, error: 'Category data required' };
          }
          let catSheet = ss.getSheetByName(TABS.CATEGORIES);
          if (!catSheet) { initAllTabs(ss); catSheet = ss.getSheetByName(TABS.CATEGORIES); }
          const catId = String(params.data.id || params.data.Category_ID || ('cat_' + new Date().getTime())).trim();
          const nameMr = String(params.data.name || params.data.Name_MR || '').trim();
          const nameEn = String(params.data.nameEn || params.data.Name_EN || '').trim();
          const isActive = params.data.isActive !== undefined ? Boolean(params.data.isActive) : (params.data.Is_Active !== undefined ? Boolean(params.data.Is_Active) : true);
          const sortOrder = Number(params.data.sortOrder ?? params.data.Sort_Order ?? 0);
          const now = new Date().toISOString();
          const lr = catSheet.getLastRow();
          if (lr > 1) {
            const allIds = catSheet.getRange(2, 1, lr - 1, 1).getValues().map(function(r) { return String(r[0]).trim().toLowerCase(); });
            const idx = allIds.indexOf(catId.toLowerCase());
            if (idx !== -1) {
              const rowNum = idx + 2;
              catSheet.getRange(rowNum, 2).setValue(nameMr);
              catSheet.getRange(rowNum, 3).setValue(nameEn);
              catSheet.getRange(rowNum, 4).setValue(isActive);
              catSheet.getRange(rowNum, 5).setValue(sortOrder);
              catSheet.getRange(rowNum, 7).setValue(now);
              return { success: true, updated: true, id: catId };
            }
          }
          catSheet.appendRow([catId, nameMr, nameEn, isActive, sortOrder, now, now]);
          return { success: true, inserted: true, id: catId };
        })();
        break;

      case 'saveService':
        result = (function() {
          if (!params.data || (!params.data.id && !params.data.Service_ID && !params.data.nameMr && !params.data.Name_MR)) {
            return { success: false, error: 'Service data required' };
          }
          let servSheet = ss.getSheetByName(TABS.SERVICES);
          if (!servSheet) { initAllTabs(ss); servSheet = ss.getSheetByName(TABS.SERVICES); }
          const sId = String(params.data.id || params.data.Service_ID || ('serv_' + new Date().getTime())).trim();
          const nameMr = String(params.data.nameMr || params.data.Name_MR || '').trim();
          const nameEn = String(params.data.nameEn || params.data.Name_EN || '').trim();
          const cardImg = String(params.data.cardImageUrl || params.data.Card_Image_URL || '').trim();
          const slideImgs = String(params.data.slideshowImages || params.data.Slideshow_Images || '').trim();
          const descMr = String(params.data.descriptionMr || params.data.Description_MR || '').trim();
          const descEn = String(params.data.descriptionEn || params.data.Description_EN || '').trim();
          const benefits = String(params.data.keyBenefitsMr || params.data.Key_Benefits_MR || '').trim();
          const feedback = String(params.data.farmerFeedback || params.data.Farmer_Feedback || '').trim();
          const isActive = params.data.isActive !== undefined ? Boolean(params.data.isActive) : true;
          const showOnPortal = params.data.showOnPortal !== undefined ? Boolean(params.data.showOnPortal) : true;
          const sortOrder = Number(params.data.sortOrder ?? params.data.Sort_Order ?? 1);
          const now = new Date().toISOString();

          const lr = servSheet.getLastRow();
          if (lr > 1) {
            const allIds = servSheet.getRange(2, 1, lr - 1, 1).getValues().map(function(r) { return String(r[0]).trim().toLowerCase(); });
            const idx = allIds.indexOf(sId.toLowerCase());
            if (idx !== -1) {
              const rowNum = idx + 2;
              servSheet.getRange(rowNum, 2, 1, 12).setValues([[
                nameMr, nameEn, cardImg, slideImgs, descMr, descEn, benefits, feedback, isActive, showOnPortal, sortOrder, now
              ]]);
              return { success: true, updated: true, id: sId };
            }
          }
          servSheet.appendRow([sId, nameMr, nameEn, cardImg, slideImgs, descMr, descEn, benefits, feedback, isActive, showOnPortal, sortOrder, now, now]);
          return { success: true, inserted: true, id: sId };
        })();
        break;

      case 'saveConsultancyCustomer':
        result = (function() {
          if (!params.data) return { success: false, error: 'Customer data required' };
          let custSheet = ss.getSheetByName(TABS.CONSULTANCY_CUSTOMERS);
          if (!custSheet) { initAllTabs(ss); custSheet = ss.getSheetByName(TABS.CONSULTANCY_CUSTOMERS); }
          const mobile = String(params.data.mobile || params.data.Mobile || '').replace(/\D/g, '').slice(-10);
          const cId = String(params.data.id || params.data.ID || ('CC_' + (mobile || new Date().getTime()))).trim();
          const name = String(params.data.name || params.data.customerName || params.data.Customer_Name || '').trim();
          const crop = String(params.data.crop || params.data.Crop || '').trim();
          const address = String(params.data.address || params.data.Address || '').trim();
          const status = String(params.data.status || params.data.Status || 'Active').trim();
          const acres = String(params.data.areaAcres || params.data.Area_Acres || '1').trim();
          const startDate = String(params.data.startDate || params.data.Start_Date || new Date().toISOString().split('T')[0]).trim();
          const notes = String(params.data.notes || params.data.Notes || '').trim();
          const now = new Date().toISOString();

          const lr = custSheet.getLastRow();
          if (lr > 1) {
            const allIds = custSheet.getRange(2, 1, lr - 1, 3).getValues();
            for (let i = 0; i < allIds.length; i++) {
              const rowId = String(allIds[i][0]).trim().toLowerCase();
              const rowMobile = String(allIds[i][2]).replace(/\D/g, '').slice(-10);
              if (rowId === cId.toLowerCase() || (mobile && rowMobile === mobile)) {
                const rowNum = i + 2;
                custSheet.getRange(rowNum, 2, 1, 9).setValues([[
                  name, mobile, crop, address, status, acres, startDate, notes, now
                ]]);
                return { success: true, updated: true, id: cId, mobile: mobile };
              }
            }
          }
          custSheet.appendRow([cId, name, mobile, crop, address, status, acres, startDate, notes, now, now]);
          return { success: true, inserted: true, id: cId, mobile: mobile };
        })();
        break;

      case 'syncAll':
        result = bulkSyncData(ss, params.data);
        break;
        
      default:
        result = { success: false, error: 'Invalid action: ' + action };
    }
    
    output.setContent(JSON.stringify(result));
    return output;
  } catch (err) {
    output.setContent(JSON.stringify({
      success: false,
      error: err.toString(),
      stack: err.stack
    }));
    return output;
  }
}

// --------------------------------------------------------------------------
// 1. Initialize Tabs & Headers
// --------------------------------------------------------------------------
function initAllTabs(ss) {
  const schema = {
    [TABS.STATS]: ['Metric_Key', 'Metric_Name', 'Value', 'Last_Updated'],
    [TABS.INVENTORY]: ['ID', 'Name', 'Category', 'Subcategory', 'Company', 'Unit', 'Pack', 'Purchase_Price', 'Selling_Price', 'Available_Stock', 'Min_Alert_Qty', 'Updated_At', 'Product_ID', 'Name_EN', 'Category_EN', 'Company_EN', 'Badge_MR', 'Image_URL', 'Short_MR', 'Description_MR', 'Usage_MR', 'Crops_MR', 'Is_Active'],
    [TABS.PURCHASES]: ['Lot_ID', 'Date', 'Supplier', 'Category', 'Product_Name', 'Product_Name_EN', 'Bulk_Qty', 'Unit', 'Total_Cost', 'Unit_Cost', 'Selling_Price', 'Notes'],
        [TABS.CHALLANS]: ['Challan_No', 'Date', 'Customer_Name', 'Mobile', 'Address', 'Vehicle_No', 'Driver_Name', 'Status', 'Items_JSON', 'Remarks', 'Converted_To_Bill'],
    [TABS.CUSTOMERS]: ['Mobile', 'Customer_Name', 'Address', 'Total_Bills', 'Total_Purchased', 'Total_Paid', 'Balance_Udhaari', 'Last_Visit'],
    [TABS.USERS]: ['ID', 'Username', 'Password', 'Role', 'Full_Name', 'Mobile', 'Created_At'],
    [TABS.SETTINGS]: ['Key', 'Value', 'Description'],
    [TABS.PRODUCTS]: ['Product_ID', 'Name_MR', 'Name_EN', 'Category_ID', 'Category_MR', 'Category_EN', 'Company_MR', 'Company_EN', 'Price', 'Pack', 'Badge_MR', 'Image_URL', 'Short_MR', 'Description_MR', 'Usage_MR', 'Crops_MR', 'Is_Active', 'Sort_Order', 'Created_At', 'Updated_At'],
    [TABS.CATEGORIES]: ['Category_ID', 'Name_MR', 'Name_EN', 'Is_Active', 'Sort_Order', 'Created_At', 'Updated_At'],
    [TABS.SERVICES]: ['Service_ID', 'Name_MR', 'Name_EN', 'Card_Image_URL', 'Slideshow_Images', 'Description_MR', 'Description_EN', 'Key_Benefits_MR', 'Farmer_Feedback', 'Is_Active', 'Show_On_Portal', 'Sort_Order', 'Created_At', 'Updated_At'],
    [TABS.CONSULTANCY_CUSTOMERS]: ['ID', 'Customer_Name', 'Mobile', 'Crop', 'Address', 'Status', 'Area_Acres', 'Start_Date', 'Notes', 'Created_At', 'Updated_At'],
    [TABS.PRODUCT_REQUESTS]: ['Request_ID', 'Product_Name', 'Short_Description', 'Usage_Description', 'Created_At', 'Status']
  };
  
  for (let tabName in schema) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    const headers = schema[tabName];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#176b3a').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }

  const MONTHLY_BILL_HEADERS = [
    'Bill_No', 'Billbook_Bill_No', 'Date', 'Customer_Name', 'Mobile', 'Address',
    'Total_Amount', 'Paid_Amount', 'Balance_Amount', 'Payment_Status', 'Payment_Mode',
    'Items_JSON', 'Notes', 'Created_At', 'Is_Consultancy_Customer', 'Consultancy_Crop'
  ];

  // Ensure headers on any existing Bills or monthly Bills tabs (Bills_YYYY_MM)
  const allExistingSheets = ss.getSheets();
  allExistingSheets.forEach(function(sh) {
    if (isBillsSheetName(sh.getName())) {
      ensureHeader(sh, 'Billbook_Bill_No');
      ensureHeader(sh, 'Is_Consultancy_Customer');
      ensureHeader(sh, 'Consultancy_Crop');
    }
  });

  // Explicitly ensure Bills_2026_10 and Bills_2026_11 tabs exist with complete headers
  ['Bills_2026_10', 'Bills_2026_11'].forEach(function(tabName) {
    let mSheet = ss.getSheetByName(tabName);
    if (!mSheet) {
      mSheet = ss.insertSheet(tabName);
      mSheet.appendRow(MONTHLY_BILL_HEADERS);
      mSheet.getRange(1, 1, 1, MONTHLY_BILL_HEADERS.length).setFontWeight('bold').setBackground('#176b3a').setFontColor('#ffffff');
      mSheet.setFrozenRows(1);
    }
    ensureHeader(mSheet, 'Billbook_Bill_No');
    ensureHeader(mSheet, 'Is_Consultancy_Customer');
    ensureHeader(mSheet, 'Consultancy_Crop');
  });

  ensureHeader(ss.getSheetByName(TABS.PURCHASES), 'Product_Name_EN');

  // Add bilingual inventory fields to sheets created with the earlier 11-column schema.
  const inventorySheet = ss.getSheetByName(TABS.INVENTORY);
  if (inventorySheet.getLastColumn() === 11) {
    inventorySheet.getRange(1, 12, 1, 4).setValues([['Product_ID', 'Name_EN', 'Category_EN', 'Company_EN']]);
    inventorySheet.getRange(1, 12, 1, 4).setFontWeight('bold').setBackground('#176b3a').setFontColor('#ffffff');
  }
  
  // Seed Default Users if empty
  const userSheet = ss.getSheetByName(TABS.USERS);
  if (userSheet.getLastRow() <= 1) {
    userSheet.appendRow(['u1', 'admin', 'admin123', 'admin', 'निलेश दवंगे (Admin)', '8459568940', new Date().toISOString()]);
    userSheet.appendRow(['u2', 'staff', 'staff123', 'staff', 'काउंटर ऑपरेटर', '9876543210', new Date().toISOString()]);
  }
  
  // Seed Default Stats & Auto-Sync
  syncCustomersFromBills(ss);
  syncConsultancyCustomersFromBills(ss);
  seedDefaultServices(ss);
  updateCachedStats(ss);
  
  return { success: true, message: 'सर्व टॅब्स, सेवा व ग्राहक यशस्वीरीत्या तयार व सिंक झाले!' };
}

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// 2. High-speed Paginated Fetch (Default 10 recent records)
// --------------------------------------------------------------------------
function getRecentPaginated(ss, sheetName, page, limit, search, category) {
  if (sheetName === TABS.USERS) {
    return { success: false, error: 'Users records are not available through the public API' };
  }
  if (sheetName === TABS.BILLS) {
    const records = getAllBillRecords(ss);
    const query = String(search || '').trim().toLowerCase();
    const filtered = records.filter(function(record) {
      return !query || Object.keys(record).some(function(key) {
        return String(record[key] || '').toLowerCase().indexOf(query) !== -1;
      });
    }).sort(function(a, b) {
      return dashboardBillDateKey(b).localeCompare(dashboardBillDateKey(a));
    });
    const validLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const totalPages = Math.ceil(filtered.length / validLimit) || 1;
    const validPage = Math.max(1, Math.min(Number(page) || 1, totalPages));
    return {
      success: true,
      data: filtered.slice((validPage - 1) * validLimit, validPage * validLimit),
      total: filtered.length,
      page: validPage,
      limit: validLimit,
      totalPages: totalPages
    };
  }

  let sheet = null;
  if (sheetName === TABS.CUSTOMERS || /^customers?$/i.test(sheetName) || sheetName === 'ग्राहक') {
    sheet = findCustomersSheet(ss);
    if (!sheet || sheet.getLastRow() <= 1) {
      syncCustomersFromBills(ss);
      sheet = findCustomersSheet(ss);
    }
  } else if (sheetName === TABS.CONSULTANCY_CUSTOMERS || /^consultancy_?customers?$/i.test(sheetName)) {
    sheet = ss.getSheetByName(TABS.CONSULTANCY_CUSTOMERS);
    if (!sheet || sheet.getLastRow() <= 1) {
      syncConsultancyCustomersFromBills(ss);
      sheet = ss.getSheetByName(TABS.CONSULTANCY_CUSTOMERS);
    }
  } else {
    sheet = ss.getSheetByName(sheetName);
  }

  if (!sheet) {
    return { success: false, error: 'Sheet not found: ' + sheetName };
  }
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1) {
    return { success: true, data: [], total: 0, page: 1, totalPages: 0 };
  }
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const totalRows = lastRow - 1;
  const dataRange = sheet.getRange(2, 1, totalRows, lastCol).getValues();
  
  let records = [];
  for (let i = dataRange.length - 1; i >= 0; i--) {
    const row = dataRange[i];
    let obj = {};
    for (let c = 0; c < headers.length; c++) {
      let val = row[c];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[headers[c]] = val;
    }
    
    if (search) {
      const s = search.toLowerCase();
      const match = Object.values(obj).some(val => String(val).toLowerCase().indexOf(s) !== -1);
      if (!match) continue;
    }
    if (category) {
      const rowCategory = obj.Category || obj.category || obj.Category_MR || obj.Category_EN || '';
      if (String(rowCategory).trim().toLowerCase() !== String(category).trim().toLowerCase()) continue;
    }
    records.push(obj);
  }
  
  const total = records.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const validPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (validPage - 1) * limit;
  const paginatedData = records.slice(startIndex, startIndex + limit);
  
  return {
    success: true,
    data: paginatedData,
    total: total,
    page: validPage,
    limit: limit,
    totalPages: totalPages
  };
}

// --------------------------------------------------------------------------
// 3. Get All Records for a Sheet
// --------------------------------------------------------------------------
function getAllRecords(ss, sheetName) {
  if (sheetName === TABS.USERS) {
    return { success: false, error: 'Users records are not available through the public API' };
  }
  if (sheetName === TABS.BILLS) {
    return { success: true, data: getAllBillRecords(ss) };
  }
  if (sheetName === TABS.CUSTOMERS || /^customers?$/i.test(sheetName) || sheetName === 'ग्राहक') {
    let custSheet = findCustomersSheet(ss);
    if (!custSheet || custSheet.getLastRow() <= 1) {
      syncCustomersFromBills(ss);
      custSheet = findCustomersSheet(ss);
    }
    if (!custSheet || custSheet.getLastRow() <= 1) return { success: true, data: [] };
    const lastRow = custSheet.getLastRow();
    const lastCol = custSheet.getLastColumn();
    const headers = custSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const values = custSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const list = values.map(function(row) {
      let item = {};
      headers.forEach(function(h, idx) {
        let val = row[idx];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        item[h] = val;
      });
      return item;
    });
    return { success: true, data: list };
  }
  if (sheetName === TABS.SERVICES) {
    let servSheet = ss.getSheetByName(TABS.SERVICES);
    if (!servSheet || servSheet.getLastRow() <= 1) {
      seedDefaultServices(ss);
      servSheet = ss.getSheetByName(TABS.SERVICES);
    }
  }
  if (sheetName === TABS.CONSULTANCY_CUSTOMERS) {
    let ccSheet = ss.getSheetByName(TABS.CONSULTANCY_CUSTOMERS);
    if (!ccSheet || ccSheet.getLastRow() <= 1) {
      syncConsultancyCustomersFromBills(ss);
      ccSheet = ss.getSheetByName(TABS.CONSULTANCY_CUSTOMERS);
    }
  }
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    initAllTabs(ss);
    sheet = ss.getSheetByName(sheetName);
  }
  if (!sheet) return { success: false, error: 'Sheet not found: ' + sheetName };
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return { success: true, data: [] };
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  const list = values.map(row => {
    let item = {};
    headers.forEach((h, idx) => {
      let val = row[idx];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      item[h] = val;
    });
    return item;
  });
  
  return { success: true, data: list };
}

function dashboardMonthKey(year, month) {
  return String(year) + '_' + String(month).padStart(2, '0');
}

function dashboardBillDateKey(record) {
  const value = getRecordValue(record, 'Date');
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(text)) return text.substring(0, 10);
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? '' : Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function dashboardSheetRecords(sheet) {
  if (!sheet || sheet.getLastRow() <= 1 || sheet.getLastColumn() < 1) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(function(row) {
    const record = {};
    headers.forEach(function(header, index) { record[header] = row[index]; });
    return record;
  });
}

function getAllBillRecords(ss) {
  const allSheets = ss.getSheets();
  const monthlySheets = allSheets.filter(function(sheet) {
    return /^Bill+s?[_\s-][0-9]{4}[_\s-][0-9]{2}$/i.test(sheet.getName());
  });
  const sheets = monthlySheets.length > 0
    ? monthlySheets
    : allSheets.filter(function(sheet) { return isBillsSheetName(sheet.getName()); });
  return sheets.reduce(function(all, sheet) {
    return all.concat(dashboardSheetRecords(sheet));
  }, []);
}

function getBillRecordsForRange(ss, startDate, endDate) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(startDate) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(endDate)) {
    throw new Error('Dashboard dates must use YYYY-MM-DD format.');
  }
  const first = new Date(startDate + 'T00:00:00');
  const last = new Date(endDate + 'T00:00:00');
  if (isNaN(first.getTime()) || isNaN(last.getTime()) || first > last) {
    throw new Error('Invalid dashboard date range.');
  }

  const records = [];
  const baseSheet = ss.getSheetByName(TABS.BILLS);
  let baseRecords = null;
  const monthCount = (last.getFullYear() - first.getFullYear()) * 12 + last.getMonth() - first.getMonth() + 1;
  if (monthCount > 24) throw new Error('Dashboard date range cannot exceed 24 months.');
  for (let offset = 0; offset < monthCount; offset++) {
    const monthDate = new Date(first.getFullYear(), first.getMonth() + offset, 1);
    const monthlySheet = ss.getSheetByName('Bills_' + dashboardMonthKey(monthDate.getFullYear(), monthDate.getMonth() + 1));
    const monthRecords = monthlySheet
      ? dashboardSheetRecords(monthlySheet)
      : (baseSheet ? (baseRecords || (baseRecords = dashboardSheetRecords(baseSheet))).filter(function(record) {
          const key = dashboardBillDateKey(record);
          return key.substring(0, 7) === Utilities.formatDate(monthDate, Session.getScriptTimeZone(), 'yyyy-MM');
        }) : []);
    monthRecords.forEach(function(record) {
      const dateKey = dashboardBillDateKey(record);
      if (dateKey >= startDate && dateKey <= endDate) records.push(record);
    });
  }
  return records;
}

function getDashboardMetricsForRange(ss, params) {
  const startDate = String(params.startDate || '');
  const endDate = String(params.endDate || '');
  const selectedCategory = String(params.category || 'all');
  const search = String(params.search || '').trim().toLowerCase();
  const status = String(params.status || 'all');
  const pageSize = Math.max(1, Math.min(100, Number(params.limit) || 5));
  const page = Math.max(1, Number(params.page) || 1);
  const billRecords = getBillRecordsForRange(ss, startDate, endDate);
  const inventory = dashboardSheetRecords(ss.getSheetByName(TABS.INVENTORY));
  const categoryByRef = Object.create(null);
  inventory.forEach(function(item, index) {
    const category = getRecordValue(item, 'Category') || getRecordValue(item, 'Category_MR') || getRecordValue(item, 'Category_EN') || 'इतर';
    [getRecordValue(item, 'ID'), getRecordValue(item, 'Name'), getRecordValue(item, 'Name_EN')].forEach(function(ref) {
      const key = String(ref || '').trim().toLowerCase();
      if (key && !Object.prototype.hasOwnProperty.call(categoryByRef, key)) categoryByRef[key] = { category: category, index: index };
    });
  });
  function itemCategory(item) {
    const explicit = getRecordValue(item, 'Category');
    if (explicit) return explicit;
    const refs = [
      getRecordValue(item, 'Product_ID'), getRecordValue(item, 'ProductId'), getRecordValue(item, 'InventoryId'),
      getRecordValue(item, 'Product_Name'), getRecordValue(item, 'ProductName'), getRecordValue(item, 'Name'), getRecordValue(item, 'ID')
    ];
    let match = null;
    refs.forEach(function(ref) {
      const candidate = categoryByRef[String(ref || '').trim().toLowerCase()];
      if (candidate && (!match || candidate.index < match.index)) match = candidate;
    });
    return match ? match.category : 'इतर';
  }
  function lineTotal(item) {
    const explicit = getRecordValue(item, 'Total_Amount') || getRecordValue(item, 'Total') || getRecordValue(item, 'Line_Total') || getRecordValue(item, 'Amount');
    return Number(explicit || (Number(getRecordValue(item, 'Quantity') || getRecordValue(item, 'Qty') || 0) * Number(getRecordValue(item, 'Price') || getRecordValue(item, 'Selling_Price') || getRecordValue(item, 'Rate') || 0))) || 0;
  }
  const normalizedBills = billRecords.map(function(record) {
    let items = getRecordValue(record, 'Items_JSON') || getRecordValue(record, 'Items') || [];
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (error) { items = []; }
    }
    if (!Array.isArray(items)) items = [];
    const total = Number(getRecordValue(record, 'Total_Amount') || 0);
    const paid = Number(getRecordValue(record, 'Paid_Amount') || 0);
    const due = Number(getRecordValue(record, 'Balance_Amount') || 0);
    const lines = items.map(function(item) {
      return { category: itemCategory(item), amount: lineTotal(item) };
    });
    const matching = selectedCategory === 'all' ? lines : lines.filter(function(line) { return line.category === selectedCategory; });
    const selectedTotal = selectedCategory === 'all' || !lines.length
      ? total
      : matching.reduce(function(sum, line) { return sum + line.amount; }, 0);
    const ratio = total ? selectedTotal / total : 0;
    const dateKey = dashboardBillDateKey(record);
    return {
      billNo: getRecordValue(record, 'Bill_No') || getRecordValue(record, 'ID'),
      billDate: dateKey,
      totalAmount: total,
      paidAmount: paid,
      balanceAmount: due,
      customerName: getRecordValue(record, 'Customer_Name'),
      items: items,
      _filteredTotal: selectedTotal,
      _filteredPaid: paid * ratio,
      _filteredDue: due * ratio,
      _categories: lines
    };
  }).filter(function(bill) {
    return bill.billDate >= startDate && bill.billDate <= endDate &&
      (selectedCategory === 'all' || bill._categories.some(function(line) { return line.category === selectedCategory; }));
  }).sort(function(a, b) { return b.billDate.localeCompare(a.billDate); });

  const selectedTotals = normalizedBills.reduce(function(totals, bill) {
    totals.sales += bill._filteredTotal;
    totals.paid += bill._filteredPaid;
    totals.due += bill._filteredDue;
    return totals;
  }, { sales: 0, paid: 0, due: 0 });
  const chartData = {};
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const monthly = start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth();
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const day = Utilities.formatDate(cursor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    chartData[monthly ? day.substring(0, 7) : day] = 0;
  }
  normalizedBills.forEach(function(bill) {
    const key = monthly ? bill.billDate.substring(0, 7) : bill.billDate;
    if (Object.prototype.hasOwnProperty.call(chartData, key)) chartData[key] += bill._filteredTotal;
  });
  const categories = {};
  normalizedBills.forEach(function(bill) {
    bill._categories.forEach(function(line) {
      categories[line.category] = (categories[line.category] || 0) + line.amount;
    });
  });
  const visible = normalizedBills.filter(function(bill) {
    const matchesSearch = !search || (String(bill.billNo) + ' ' + String(bill.customerName)).toLowerCase().indexOf(search) !== -1;
    const isDue = bill._filteredDue > 0;
    return matchesSearch && (status === 'all' || (status === 'due' ? isDue : !isDue));
  });
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const validPage = Math.min(page, totalPages);
  const pageBills = visible.slice((validPage - 1) * pageSize, validPage * pageSize).map(function(bill) {
    delete bill._categories;
    return bill;
  });
  const inventoryStats = inventory.reduce(function(stats, item) {
    const stock = Number(getRecordValue(item, 'Available_Stock') || getRecordValue(item, 'Quantity') || getRecordValue(item, 'Stock') || 0);
    const minimum = Number(getRecordValue(item, 'Min_Alert_Qty') || 10);
    stats.totalStockValuation += Number(getRecordValue(item, 'Purchase_Price') || 0) * stock;
    if (stock <= minimum) {
      stats.lowStockCount++;
      if (stats.lowStockItems.length < 100) stats.lowStockItems.push({
        id: getRecordValue(item, 'ID') || getRecordValue(item, 'Product_ID'),
        name: getRecordValue(item, 'Name'),
        category: getRecordValue(item, 'Category') || 'इतर',
        availableStock: stock,
        minAlertQty: minimum
      });
    }
    return stats;
  }, { totalStockValuation: 0, lowStockCount: 0, lowStockItems: [] });
  const customers = dashboardSheetRecords(ss.getSheetByName(TABS.CUSTOMERS));
  const pendingKhata = customers.map(function(customer) {
    return {
      id: getRecordValue(customer, 'ID'),
      customerName: getRecordValue(customer, 'Customer_Name'),
      mobile: getRecordValue(customer, 'Mobile'),
      totalPurchased: Number(getRecordValue(customer, 'Total_Purchased') || 0),
      balanceUdhaari: Number(getRecordValue(customer, 'Balance_Udhaari') || 0)
    };
  }).filter(function(customer) { return customer.balanceUdhaari > 0; })
    .sort(function(a, b) { return b.balanceUdhaari - a.balanceUdhaari; });
  const challans = dashboardSheetRecords(ss.getSheetByName(TABS.CHALLANS)).sort(function(a, b) {
    return dashboardBillDateKey(b).localeCompare(dashboardBillDateKey(a));
  });
  const totalChallans = challans.length;
  return {
    success: true,
    data: {
      selectedTotals: selectedTotals,
      totalBills: normalizedBills.length,
      bills: pageBills,
      billPagination: { page: validPage, limit: pageSize, total: visible.length, totalPages: totalPages },
      chartData: Object.keys(chartData).sort().map(function(label) { return { label: label, value: chartData[label] }; }),
      categoryData: Object.keys(categories).map(function(category) { return [category, categories[category]]; })
        .sort(function(a, b) { return b[1] - a[1]; }).slice(0, 8),
      totalChallans: totalChallans,
      totalInventoryProducts: inventory.length,
      totalStockValuation: inventoryStats.totalStockValuation,
      lowStockCount: inventoryStats.lowStockCount,
      lowStockItems: inventoryStats.lowStockItems,
      pendingKhata: pendingKhata,
      totalCustomers: customers.length,
      challans: challans.slice(0, 6),
      categories: Array.from(new Set(inventory.map(function(item) { return getRecordValue(item, 'Category') || getRecordValue(item, 'Category_MR'); }).filter(Boolean))).sort()
    }
  };
}

function publicInventoryRecord(record) {
  const publicRecord = Object.assign({}, record);
  ['Purchase_Price', 'Available_Stock', 'Min_Alert_Qty', 'Updated_At'].forEach(function(header) {
    const key = Object.keys(publicRecord).find(candidate => normalizeHeader(candidate) === normalizeHeader(header));
    if (key) delete publicRecord[key];
  });
  return publicRecord;
}

function inventoryWithoutPricingRecord(record) {
  const safeRecord = Object.assign({}, record);
  ['Purchase_Price', 'Selling_Price'].forEach(function(header) {
    const key = Object.keys(safeRecord).find(candidate => normalizeHeader(candidate) === normalizeHeader(header));
    if (key) delete safeRecord[key];
  });
  return safeRecord;
}

function publicProductRecord(record) {
  const publicRecord = Object.assign({}, record);
  const priceKey = Object.keys(publicRecord).find(candidate => normalizeHeader(candidate) === 'price');
  if (priceKey) delete publicRecord[priceKey];
  return publicRecord;
}

function requireStaffOrAdmin(ss, token) {
  const session = validateAuthSession(ss, token);
  if (!session.valid || !session.user) return { success: false, error: 'Sign in is required to access these records.' };
  if (session.user.role !== 'admin' && session.user.role !== 'staff') {
    return { success: false, error: 'These records are not available for this account.' };
  }
  return { success: true };
}

function getBillsForCustomer(ss, token) {
  const session = validateAuthSession(ss, token);
  if (!session.valid || !session.user || session.user.role !== 'customer') {
    return { success: false, error: 'A valid customer session is required.' };
  }
  const mobile = String(
    session.user.mobile ||
    session.user.username ||
    session.user.phone ||
    String(session.user.id || '').replace(/^CUST-/i, '')
  ).replace(/\D/g, '').slice(-10);
  if (!mobile) return { success: false, error: 'No mobile number is associated with this account.' };

  const data = getAllBillRecords(ss).filter(function(record) {
    const rowMobile = String(
      getRecordValue(record, 'Mobile') ||
      getRecordValue(record, 'Customer_Mobile') ||
      getRecordValue(record, 'mobile') ||
      ''
    ).replace(/\D/g, '').slice(-10);
    return rowMobile === mobile;
  }).sort(function(a, b) {
    return dashboardBillDateKey(b).localeCompare(dashboardBillDateKey(a));
  }).map(function(record) {
    const rowMobile = String(
      getRecordValue(record, 'Mobile') ||
      getRecordValue(record, 'Customer_Mobile') ||
      getRecordValue(record, 'mobile') ||
      mobile
    ).replace(/\D/g, '').slice(-10);

    let sourceItems = getRecordValue(record, 'Items_JSON') || getRecordValue(record, 'Items') || [];
    if (typeof sourceItems === 'string') {
      try { sourceItems = JSON.parse(sourceItems || '[]'); } catch (error) { sourceItems = []; }
    }
    const safeItems = (Array.isArray(sourceItems) ? sourceItems : []).map(function(item) {
      return {
        id: item.inventoryId || item.productId || item.id || '',
        name: item.name || item.Name || item.Name_MR || '',
        nameEn: item.nameEn || item.Name_EN || item.name_en || '',
        qty: Number(item.qty || item.Quantity || item.quantity || 0),
        unit: item.unit || item.Unit || 'नग',
        price: Number(item.price || item.Price || 0),
        total: Number(item.total || item.Total || 0)
      };
    });
    return {
      Bill_No: getRecordValue(record, 'Bill_No') || '',
      Billbook_Bill_No: getRecordValue(record, 'Billbook_Bill_No') || '',
      Date: dashboardBillDateKey(record),
      Customer_Name: getRecordValue(record, 'Customer_Name') || getRecordValue(record, 'Name') || '',
      Customer_Mobile: rowMobile,
      Mobile: rowMobile,
      Customer_Address: getRecordValue(record, 'Customer_Address') || getRecordValue(record, 'Address') || '',
      Total_Amount: Number(getRecordValue(record, 'Total_Amount') || 0),
      Paid_Amount: Number(getRecordValue(record, 'Paid_Amount') || 0),
      Balance_Amount: Number(getRecordValue(record, 'Balance_Amount') || 0),
      Payment_Status: getRecordValue(record, 'Payment_Status') || '',
      Payment_Mode: getRecordValue(record, 'Payment_Mode') || 'Cash',
      Items_JSON: JSON.stringify(safeItems),
      Notes: getRecordValue(record, 'Notes') || ''
    };
  });
  return { success: true, data: data, total: data.length };
}

function normalizeHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getRecordValue(record, header) {
  const normalized = normalizeHeader(header);
  if (Object.prototype.hasOwnProperty.call(record, header)) return record[header];
  const keys = Object.keys(record || {});
  const directKey = keys.find(key => normalizeHeader(key) === normalized);
  if (directKey) return record[directKey];

  const aliases = {
    id: ['id', 'inventoryid', 'productid'],
    name: ['name', 'namemr', 'productname', 'itemname'],
    category: ['category', 'categorymr', 'categoryname'],
    company: ['company', 'companymr'],
    pack: ['pack', 'unitpack'],
    purchaseprice: ['purchaseprice', 'costprice'],
    sellingprice: ['sellingprice', 'price'],
    availablestock: ['availablestock', 'currentstock', 'quantity', 'qty'],
    minalertqty: ['minalertqty', 'alertqty'],
    billno: ['billno', 'billnumber', 'invoiceno'],
    billbookbillno: ['billbookbillno', 'billbooknumber', 'physicalbillno', 'billbookno'],
    date: ['date', 'billdate', 'invoicedate'],
    customername: ['customername', 'customer', 'custname', 'name', 'farmername', 'farmer', 'clientname'],
    mobile: ['mobile', 'customermobile', 'phone', 'phoneno', 'contact', 'customerphone', 'mob', 'mobilenumber', 'contactno'],
    address: ['address', 'customeraddress', 'village', 'place', 'city', 'location'],
    totalamount: ['totalamount', 'total', 'grandtotal', 'amount', 'billamount'],
    paidamount: ['paidamount', 'paid', 'receivedamount', 'received'],
    balanceamount: ['balanceamount', 'balance', 'udhaari', 'udhari', 'dueamount', 'due', 'remaining'],
    paymentstatus: ['paymentstatus', 'status'],
    paymentmode: ['paymentmode', 'mode'],
    itemsjson: ['itemsjson', 'items'],
    notes: ['notes', 'remarks'],
    createdat: ['createdat', 'timestamp'],
    isconsultancycustomer: ['isconsultancycustomer', 'isconsultancy', 'consultancy', 'consultancycustomer'],
    consultancycrop: ['consultancycrop', 'crop', 'consultancycroptype']
  };
  const candidates = aliases[normalized] || [normalized];
  const match = keys.find(key => candidates.includes(normalizeHeader(key)));
  return match ? record[match] : '';
}

function ensureHeader(sheet, header) {
  if (!sheet) return;
  const lastColumn = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  if (headers.some(value => normalizeHeader(value) === normalizeHeader(header))) return;
  const nextColumn = headers.filter(value => value !== '').length + 1;
  sheet.getRange(1, nextColumn).setValue(header).setFontWeight('bold').setBackground('#176b3a').setFontColor('#ffffff');
}

// --------------------------------------------------------------------------
// 4. Save Bill + Deduct Inventory + Update Customer Khata
// --------------------------------------------------------------------------
function saveBillRecord(ss, bill) {
  if (!bill) return { success: false, error: 'No bill data provided' };
  
  const billDate = bill.billDate || new Date().toISOString().split('T')[0];
  const dateParts = String(billDate).substring(0, 10).match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
  if (!dateParts) return { success: false, error: 'Invalid bill date.' };
  const billYear = Number(dateParts[1]);
  const billMonth = Number(dateParts[2]);
  const billDay = Number(dateParts[3]);
  const parsedBillDate = new Date(billYear, billMonth - 1, billDay);
  if (billMonth < 1 || billMonth > 12 || parsedBillDate.getFullYear() !== billYear || parsedBillDate.getMonth() !== billMonth - 1 || parsedBillDate.getDate() !== billDay) {
    return { success: false, error: 'Invalid bill date.' };
  }
  const monthSheetName = 'Bills_' + dashboardMonthKey(billYear, billMonth);
  let sheet = ss.getSheetByName(monthSheetName);
  if (!sheet) {
    sheet = ss.insertSheet(monthSheetName);
    const MONTHLY_BILL_HEADERS = [
      'Bill_No', 'Billbook_Bill_No', 'Date', 'Customer_Name', 'Mobile', 'Address',
      'Total_Amount', 'Paid_Amount', 'Balance_Amount', 'Payment_Status', 'Payment_Mode',
      'Items_JSON', 'Notes', 'Created_At', 'Is_Consultancy_Customer', 'Consultancy_Crop'
    ];
    sheet.appendRow(MONTHLY_BILL_HEADERS);
    sheet.getRange(1, 1, 1, MONTHLY_BILL_HEADERS.length).setFontWeight('bold').setBackground('#176b3a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  ensureHeader(sheet, 'Billbook_Bill_No');
  ensureHeader(sheet, 'Is_Consultancy_Customer');
  ensureHeader(sheet, 'Consultancy_Crop');
  
  const billNo = bill.billNo || ('SKSK-' + Date.now());
  const itemsJson = typeof bill.items === 'string' ? bill.items : JSON.stringify(bill.items || []);
  
  // Append to Bills Sheet
  const billRecord = Object.assign({}, bill, {
    billNo: billNo,
    billDate: billDate,
    items: itemsJson,
    createdAt: new Date().toISOString()
  });
  const billHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(billHeaders.map(header => getRecordValue(billRecord, header)));
  
  // Deduct Inventory Quantities
  if (Array.isArray(bill.items)) {
    const invSheet = ss.getSheetByName(TABS.INVENTORY);
    if (invSheet && invSheet.getLastRow() > 1) {
      const invHeaders = invSheet.getRange(1, 1, 1, invSheet.getLastColumn()).getValues()[0];
      const idColumn = invHeaders.findIndex(header => normalizeHeader(header) === 'id');
      const nameColumn = invHeaders.findIndex(header => ['name', 'namemr', 'productname'].includes(normalizeHeader(header)));
      const nameEnColumn = invHeaders.findIndex(header => ['nameen', 'productnameen'].includes(normalizeHeader(header)));
      const stockColumn = invHeaders.findIndex(header => ['availablestock', 'currentstock', 'quantity', 'qty'].includes(normalizeHeader(header)));
      const updatedColumn = invHeaders.findIndex(header => normalizeHeader(header) === 'updatedat');
      const invData = invSheet.getRange(2, 1, invSheet.getLastRow() - 1, invSheet.getLastColumn()).getValues();
      bill.items.forEach(item => {
        const itemName = (item.name || '').trim().toLowerCase();
        const itemNameEn = (item.nameEn || item.name_EN || '').trim().toLowerCase();
        const itemId = item.inventoryId || item.productId || item.id;
        const qtyUsed = Number(item.qty || 0);
        if (qtyUsed > 0) {
          for (let r = 0; r < invData.length; r++) {
            const stockName = nameColumn >= 0 ? String(invData[r][nameColumn] || '').trim().toLowerCase() : '';
            const stockNameEn = nameEnColumn >= 0 ? String(invData[r][nameEnColumn] || '').trim().toLowerCase() : '';
            const stockId = idColumn >= 0 ? String(invData[r][idColumn]) : '';
            if ((itemId && stockId === String(itemId)) || (itemName && stockName === itemName) || (itemNameEn && stockNameEn === itemNameEn)) {
              const currentStock = stockColumn >= 0 ? Number(invData[r][stockColumn] || 0) : 0;
              let newStock = Math.max(0, currentStock - qtyUsed);
              if (stockColumn >= 0) invSheet.getRange(r + 2, stockColumn + 1).setValue(newStock);
              if (updatedColumn >= 0) invSheet.getRange(r + 2, updatedColumn + 1).setValue(new Date().toISOString());
              break;
            }
          }
        }
      });
    }
  }
  
  // Update Customer Khata
  updateCustomerKhata(ss, bill);

  // Sync Consultancy Customer if marked as consultancy customer or has crop
  if (bill.isConsultancy || bill.isConsultancyCustomer || bill.Is_Consultancy_Customer || bill.consultancyCrop || bill.Consultancy_Crop) {
    syncConsultancyCustomersFromBills(ss);
  }
  
  // Update Cached Stats
  updateCachedStats(ss);
  
  return { success: true, message: 'बिल यशस्वीरीत्या सेव्ह झाले व स्टॉक कमी करण्यात आला!', billNo: billNo };
}

// --------------------------------------------------------------------------
// 5. Save Delivery Challan
// --------------------------------------------------------------------------
function saveChallanRecord(ss, challan) {
  if (!challan) return { success: false, error: 'No challan data' };
  const sheet = ss.getSheetByName(TABS.CHALLANS);
  if (!sheet) initAllTabs(ss);
  
  const challanNo = challan.challanNo || ('CH-' + Date.now());
  const itemsJson = typeof challan.items === 'string' ? challan.items : JSON.stringify(challan.items || []);
  
  sheet.appendRow([
    challanNo,
    challan.date || new Date().toISOString().split('T')[0],
    challan.customerName || '',
    challan.customerMobile || '',
    challan.customerAddress || '',
    challan.vehicleNo || '',
    challan.driverName || '',
    challan.status || 'Dispatched',
    itemsJson,
    challan.remarks || '',
    challan.convertedToBill ? 'Yes' : 'No'
  ]);
  
  return { success: true, message: 'चालन यशस्वीरीत्या जतन केले!', challanNo: challanNo };
}

// --------------------------------------------------------------------------
// 6. Save or Update Inventory Item
// --------------------------------------------------------------------------
function saveInventoryItem(ss, item) {
  let sheet = ss.getSheetByName(TABS.INVENTORY);
  if (!sheet) {
    initAllTabs(ss);
    sheet = ss.getSheetByName(TABS.INVENTORY);
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColumn = headers.findIndex(header => normalizeHeader(header) === 'id');
  const id = item.id || ('INV-' + Date.now());
  const lastRow = sheet.getLastRow();
  
  if (lastRow > 1 && idColumn >= 0) {
    const ids = sheet.getRange(2, idColumn + 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
    const index = ids.indexOf(String(id));
    if (index !== -1) {
      const r = index + 2;
      const existing = sheet.getRange(r, 1, 1, headers.length).getValues()[0];
      const values = headers.map((header, column) => {
        if (column === idColumn) return existing[column];
        if (normalizeHeader(header) === 'updatedat') return new Date().toISOString();
        return getRecordValue(item, header);
      });
      sheet.getRange(r, 1, 1, headers.length).setValues([values]);
      return { success: true, message: 'स्टॉक अपडेट झाला', id: id };
    }
  }
  
  // Insert new
  const newItem = Object.assign({}, item, { id: id, updatedAt: new Date().toISOString() });
  sheet.appendRow(headers.map(header => getRecordValue(newItem, header)));
  
  return { success: true, message: 'नवीन उत्पादन इन्व्हेंटरीमध्ये जोडले गेले!', id: id };
}

// --------------------------------------------------------------------------
// 7. Save Bulk Purchase Lot
// --------------------------------------------------------------------------
function savePurchaseLot(ss, lot) {
  let sheet = ss.getSheetByName(TABS.PURCHASES);
  if (!sheet) {
    initAllTabs(ss);
    sheet = ss.getSheetByName(TABS.PURCHASES);
  }
  ensureHeader(sheet, 'Product_Name_EN');
  
  const lotId = lot.lotId || ('LOT-' + Date.now());
  const qty = Number(lot.bulkQty || 1);
  const totalCost = Number(lot.totalCost || 0);
  const unitCost = qty > 0 ? (totalCost / qty) : totalCost;

  const lotRecord = Object.assign({}, lot, {
    lotId: lotId,
    bulkQty: qty,
    totalCost: totalCost,
    unitCost: unitCost,
    sellingPrice: Number(lot.sellingPrice || 0)
  });
  const lotHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(lotHeaders.map(header => getRecordValue(lotRecord, header)));

  if (lot.inventoryItem) {
    saveInventoryItem(ss, lot.inventoryItem);
  } else {
    let invSheet = ss.getSheetByName(TABS.INVENTORY);
    if (!invSheet) {
      initAllTabs(ss);
      invSheet = ss.getSheetByName(TABS.INVENTORY);
    }
    const nameColumn = invSheet.getRange(1, 1, 1, invSheet.getLastColumn()).getValues()[0]
      .findIndex(header => ['name', 'namemr', 'productname'].includes(normalizeHeader(header)));
    const stockColumn = invSheet.getRange(1, 1, 1, invSheet.getLastColumn()).getValues()[0]
      .findIndex(header => ['availablestock', 'currentstock', 'quantity', 'qty'].includes(normalizeHeader(header)));
    let existingRow = 0;
    if (invSheet.getLastRow() > 1 && nameColumn >= 0 && stockColumn >= 0) {
      const values = invSheet.getRange(2, 1, invSheet.getLastRow() - 1, invSheet.getLastColumn()).getValues();
      existingRow = values.findIndex(row => String(row[nameColumn]).trim().toLowerCase() === String(lot.productName).trim().toLowerCase()) + 2;
    }
    if (existingRow > 1) {
      const current = Number(invSheet.getRange(existingRow, stockColumn + 1).getValue() || 0);
      invSheet.getRange(existingRow, stockColumn + 1).setValue(current + qty);
    } else {
      saveInventoryItem(ss, {
        id: 'INV-' + Date.now(),
        name: lot.productName,
        category: lot.category,
        unit: lot.unit,
        purchasePrice: unitCost,
        sellingPrice: lot.sellingPrice || (unitCost * 1.15),
        availableStock: qty,
        minAlertQty: 5
      });
    }
  }

  updateCachedStats(ss);
  
  return { success: true, message: 'घाऊक खरेदी नोंद झाली व स्टॉक वाढवला गेला!', lotId: lotId };
}

// --------------------------------------------------------------------------
// 8. Adjust Stock (+ / -)
// --------------------------------------------------------------------------
function adjustStock(ss, id, delta, reason) {
  const sheet = ss.getSheetByName(TABS.INVENTORY);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: 'Inventory empty' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColumn = headers.findIndex(header => normalizeHeader(header) === 'id');
  const stockColumn = headers.findIndex(header => ['availablestock', 'currentstock', 'quantity', 'qty'].includes(normalizeHeader(header)));
  const updatedColumn = headers.findIndex(header => normalizeHeader(header) === 'updatedat');
  if (idColumn < 0 || stockColumn < 0) return { success: false, error: 'Inventory ID or stock column not found' };
  const ids = sheet.getRange(2, idColumn + 1, sheet.getLastRow() - 1, 1).getValues().map(r => String(r[0]));
  const index = ids.indexOf(String(id));
  if (index === -1) return { success: false, error: 'Product not found' };
  
  const r = index + 2;
  const current = Number(sheet.getRange(r, stockColumn + 1).getValue() || 0);
  const updated = Math.max(0, current + Number(delta));
  sheet.getRange(r, stockColumn + 1).setValue(updated);
  if (updatedColumn >= 0) sheet.getRange(r, updatedColumn + 1).setValue(new Date().toISOString());
  
  return { success: true, newStock: updated, message: 'स्टॉक यशस्वीरीत्या बदलला (' + reason + ')' };
}

// --------------------------------------------------------------------------
// 9. Update Customer Khata Helper
// --------------------------------------------------------------------------

// ── Auto-Sync Customers From All Bills ─────────────────────────────────────────
function syncCustomersFromBills(ss) {
  ensureAllBillsHeaders(ss);
  let custSheet = ss.getSheetByName(TABS.CUSTOMERS);
  if (!custSheet) {
    custSheet = ss.insertSheet(TABS.CUSTOMERS);
    const headers = ['Mobile', 'Customer_Name', 'Address', 'Total_Bills', 'Total_Purchased', 'Total_Paid', 'Balance_Udhaari', 'Last_Visit'];
    custSheet.appendRow(headers);
    custSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#176b3a').setFontColor('#ffffff');
    custSheet.setFrozenRows(1);
  }

  const customerMap = {};

  // Preserve any existing manually entered customers in Customers sheet
  if (custSheet.getLastRow() > 1) {
    const lastRow = custSheet.getLastRow();
    const lastCol = custSheet.getLastColumn();
    const existingHeaders = custSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(normalizeHeader);
    const mIdx = existingHeaders.findIndex(h => ['mobile', 'phone', 'contact', 'customermobile', 'mobilenumber'].includes(h));
    const nIdx = existingHeaders.findIndex(h => ['customername', 'name', 'farmername', 'customer'].includes(h));
    const aIdx = existingHeaders.findIndex(h => ['address', 'village', 'place', 'location'].includes(h));
    const tbIdx = existingHeaders.findIndex(h => ['totalbills', 'bills'].includes(h));
    const tpIdx = existingHeaders.findIndex(h => ['totalpurchased', 'totalamount', 'purchased', 'amount'].includes(h));
    const tpaIdx = existingHeaders.findIndex(h => ['totalpaid', 'paidamount', 'paid'].includes(h));
    const buIdx = existingHeaders.findIndex(h => ['balanceudhaari', 'balance', 'udhaari', 'udhari', 'due'].includes(h));
    const lvIdx = existingHeaders.findIndex(h => ['lastvisit', 'date'].includes(h));

    const existingRows = custSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    existingRows.forEach(function(row) {
      const mob = mIdx >= 0 ? String(row[mIdx] || '').replace(/\D/g, '').slice(-10) : '';
      const name = nIdx >= 0 ? String(row[nIdx] || '').trim() : '';
      if (!mob && !name) return;
      const key = mob || ('NAME_' + name.toLowerCase());
      customerMap[key] = {
        mobile: mob,
        name: name || 'शेतकरी',
        address: aIdx >= 0 ? String(row[aIdx] || '').trim() : '',
        totalBills: tbIdx >= 0 ? Number(row[tbIdx] || 0) : 0,
        totalPurchased: tpIdx >= 0 ? Number(row[tpIdx] || 0) : 0,
        totalPaid: tpaIdx >= 0 ? Number(row[tpaIdx] || 0) : 0,
        balanceUdhaari: buIdx >= 0 ? Number(row[buIdx] || 0) : 0,
        lastVisit: lvIdx >= 0 ? String(row[lvIdx] || '').substring(0, 10) : ''
      };
    });
  }

  // Merge with all bills across all monthly bills sheets (Bills_2026_10, Bills_2026_11, etc.)
  const allBills = getAllBillRecords(ss);
  if (allBills && allBills.length > 0) {
    allBills.forEach(function(bill) {
      const mobile = String(getRecordValue(bill, 'Mobile') || '').replace(/\D/g, '').slice(-10);
      const name = String(getRecordValue(bill, 'Customer_Name') || '').trim();
      const addr = String(getRecordValue(bill, 'Address') || '').trim();
      if (!mobile && !name) return;

      const key = mobile || ('NAME_' + name.toLowerCase());
      const total = Number(getRecordValue(bill, 'Total_Amount') || 0);
      const paid = Number(getRecordValue(bill, 'Paid_Amount') || 0);
      const bal = Number(getRecordValue(bill, 'Balance_Amount') || (total - paid) || 0);
      const date = getRecordValue(bill, 'Date') || '';

      if (!customerMap[key]) {
        customerMap[key] = {
          mobile: mobile,
          name: name || 'शेतकरी',
          address: addr,
          totalBills: 0,
          totalPurchased: 0,
          totalPaid: 0,
          balanceUdhaari: 0,
          lastVisit: ''
        };
      }

      const c = customerMap[key];
      c.totalBills += 1;
      c.totalPurchased += total;
      c.totalPaid += paid;
      c.balanceUdhaari += Math.max(0, bal);
      if (name && (!c.name || c.name === 'शेतकरी' || c.name === 'ग्राहक')) c.name = name;
      if (addr && !c.address) c.address = addr;
      if (mobile && !c.mobile) c.mobile = mobile;
      if (date && (!c.lastVisit || String(date) > String(c.lastVisit))) {
        c.lastVisit = String(date).substring(0, 10);
      }
    });
  }

  const keys = Object.keys(customerMap);
  if (keys.length === 0) return { success: true, count: 0 };

  if (custSheet.getLastRow() > 1) {
    custSheet.getRange(2, 1, custSheet.getLastRow() - 1, custSheet.getLastColumn()).clearContent();
  }

  const rows = keys.map(function(k) {
    const c = customerMap[k];
    return [c.mobile, c.name, c.address, c.totalBills, c.totalPurchased, c.totalPaid, c.balanceUdhaari, c.lastVisit];
  });

  custSheet.getRange(2, 1, rows.length, 8).setValues(rows);
  return { success: true, count: rows.length };
}

// ── Auto-Sync Consultancy Customers ───────────────────────────────────────────
function syncConsultancyCustomersFromBills(ss) {
  let sheet = ss.getSheetByName(TABS.CONSULTANCY_CUSTOMERS);
  const headers = ['ID', 'Customer_Name', 'Mobile', 'Crop', 'Address', 'Status', 'Area_Acres', 'Start_Date', 'Notes', 'Created_At', 'Updated_At'];
  if (!sheet) {
    sheet = ss.insertSheet(TABS.CONSULTANCY_CUSTOMERS);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#176b3a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  const foundMap = {};
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow > 1) {
    const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return String(h || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    });
    const idIdx = existingHeaders.findIndex(function(h) { return h === 'id'; });
    const nIdx = existingHeaders.findIndex(function(h) { return ['customername', 'name', 'farmername'].indexOf(h) !== -1; });
    const mIdx = existingHeaders.findIndex(function(h) { return ['mobile', 'phone', 'contact'].indexOf(h) !== -1; });
    const cIdx = existingHeaders.findIndex(function(h) { return h === 'crop'; });
    const aIdx = existingHeaders.findIndex(function(h) { return ['address', 'village'].indexOf(h) !== -1; });
    const sIdx = existingHeaders.findIndex(function(h) { return h === 'status'; });
    const arIdx = existingHeaders.findIndex(function(h) { return ['areaacres', 'area'].indexOf(h) !== -1; });
    const sdIdx = existingHeaders.findIndex(function(h) { return ['startdate', 'date'].indexOf(h) !== -1; });
    const ntIdx = existingHeaders.findIndex(function(h) { return h === 'notes'; });
    const crIdx = existingHeaders.findIndex(function(h) { return h === 'createdat'; });

    const existingRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    existingRows.forEach(function(row) {
      const mob = mIdx >= 0 ? String(row[mIdx] || '').replace(/\D/g, '').slice(-10) : '';
      const name = nIdx >= 0 ? String(row[nIdx] || '').trim() : '';
      if (!mob && !name) return;
      const key = mob || ('NAME_' + name.toLowerCase());
      foundMap[key] = {
        id: idIdx >= 0 && row[idIdx] ? String(row[idIdx]) : ('CC_' + (mob || Date.now())),
        name: name || 'शेतकरी',
        mobile: mob,
        crop: cIdx >= 0 ? String(row[cIdx] || '') : '',
        address: aIdx >= 0 ? String(row[aIdx] || '') : '',
        status: sIdx >= 0 && row[sIdx] ? String(row[sIdx]) : 'Active',
        areaAcres: arIdx >= 0 && row[arIdx] ? String(row[arIdx]) : '1',
        startDate: sdIdx >= 0 ? String(row[sdIdx] || '').substring(0, 10) : '',
        notes: ntIdx >= 0 ? String(row[ntIdx] || '') : '',
        createdAt: crIdx >= 0 && row[crIdx] ? String(row[crIdx]) : new Date().toISOString()
      };
    });
  }

  const allBills = getAllBillRecords(ss);
  allBills.forEach(function(b) {
    const isCons = String(getRecordValue(b, 'Is_Consultancy_Customer') || '').toLowerCase();
    const crop = String(getRecordValue(b, 'Consultancy_Crop') || '').trim();
    if (isCons === 'true' || isCons === 'yes' || isCons === '1' || crop) {
      const mobile = String(getRecordValue(b, 'Mobile') || '').replace(/\D/g, '').slice(-10);
      const name = String(getRecordValue(b, 'Customer_Name') || '').trim();
      if (!mobile && !name) return;
      const key = mobile || ('NAME_' + name.toLowerCase());
      if (!foundMap[key]) {
        foundMap[key] = {
          id: 'CC_' + (mobile || Date.now()),
          name: name || 'शेतकरी',
          mobile: mobile,
          crop: crop || 'इतर',
          address: String(getRecordValue(b, 'Address') || '').trim(),
          status: 'Active',
          areaAcres: '1',
          startDate: String(getRecordValue(b, 'Date') || '').substring(0, 10),
          notes: '',
          createdAt: new Date().toISOString()
        };
      } else {
        if (crop && (!foundMap[key].crop || foundMap[key].crop === 'इतर')) {
          foundMap[key].crop = crop;
        }
        if (name && (!foundMap[key].name || foundMap[key].name === 'शेतकरी')) {
          foundMap[key].name = name;
        }
        const bAddr = String(getRecordValue(b, 'Address') || '').trim();
        if (bAddr && !foundMap[key].address) {
          foundMap[key].address = bAddr;
        }
      }
    }
  });

  const keys = Object.keys(foundMap);
  if (keys.length > 0) {
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    const rows = keys.map(function(k) {
      const c = foundMap[k];
      return [c.id, c.name, c.mobile, c.crop, c.address, c.status, c.areaAcres, c.startDate, c.notes, c.createdAt || new Date().toISOString(), new Date().toISOString()];
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    return { success: true, count: rows.length };
  } else if (sheet.getLastRow() <= 1) {
    const demo = [
      ['CC_8459568940', 'रमेश सखाराम पाटील', '8459568940', 'द्राक्ष (Grapes)', 'मु. पो. कानमंडाळे, चांदवड', 'Active', '3.5', '2026-01-10', 'गोडी छाटणी नियोजन पूर्ण', new Date().toISOString(), new Date().toISOString()],
      ['CC_9822334455', 'विठ्ठल किसन शिंदे', '9822334455', 'टोमॅटो (Tomato)', 'मु. पो. वडबारे, चांदवड', 'Active', '2', '2026-02-01', 'अर्ली ब्लाइट प्रतिबंधक स्प्रे', new Date().toISOString(), new Date().toISOString()],
      ['CC_9423556677', 'समाधान उत्तम बोरसे', '9423556677', 'डाळिंब (Pomegranate)', 'मु. पो. उमराणे, देवळा', 'Active', '4', '2026-01-20', 'तेल्या प्रतिबंधक नियोजन', new Date().toISOString(), new Date().toISOString()],
      ['CC_9977881122', 'ज्ञानेश्वर बापू ठाकरे', '9977881122', 'कलिंगड (Watermelon)', 'मु. पो. शिरसाणे, चांदवड', 'Active', '1.5', '2026-02-15', 'ठिबक विद्राव्य खत शेड्यूल', new Date().toISOString(), new Date().toISOString()]
    ];
    sheet.getRange(2, 1, demo.length, 11).setValues(demo);
    return { success: true, count: demo.length };
  }
  return { success: true, count: 0 };
}

// ── Seed Default Consultancy Services ──────────────────────────────────────────
function seedDefaultServices(ss) {
  let sheet = ss.getSheetByName(TABS.SERVICES);
  if (!sheet) {
    sheet = ss.insertSheet(TABS.SERVICES);
    const headers = ['Service_ID', 'Name_MR', 'Name_EN', 'Card_Image_URL', 'Slideshow_Images', 'Description_MR', 'Description_EN', 'Key_Benefits_MR', 'Farmer_Feedback', 'Is_Active', 'Show_On_Portal', 'Sort_Order', 'Created_At', 'Updated_At'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#176b3a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  if (sheet.getLastRow() > 1) return;

  const services = [
    [
      'serv_grapes',
      'द्राक्ष पीक सल्ला व कन्सल्टन्सी',
      'Grapes Crop Consultancy',
      'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1506806732259-39c2d0268443?auto=format&fit=crop&w=1200&q=80',
      'द्राक्ष बागेसाठी छाटणीपासून ते काढणीपर्यंत संपूर्ण तांत्रिक मार्गदर्शन. खरड छाटणी व गोडी छाटणी नियोजन, योग्य संजीवकांचा (PGR) वापर, डाऊनी व भुरी रोगाचे वेळेवर नियंत्रण आणि दर्जेदार एक्सपोर्ट क्वालिटी मण्यांचा आकार मिळवण्यासाठी विशेष खत व औषध वेळापत्रक.',
      'End-to-end technical consultancy for vineyards from pruning to harvesting. Comprehensive schedule for October & April pruning, precision PGR usage, Downy & Powdery Mildew management, and specialized nutrition for export-quality berry size.',
      ['• मण्यांचा एकसमान आकार आणि उत्तम चकाकी', '• डाऊनी मिल्ड्यू, करपा व भुरी रोगाचे आगाऊ नियंत्रण', '• एक्सपोर्ट मानकांनुसार औषधांचे योग्य प्रमाण (MRL सुसंगत)', '• प्रति एकर उत्पादन व उताऱ्यामध्ये हमखास वाढ'].join('\\n'),
      'स्वराज कृषी सेवा केंद्राच्या द्राक्ष सल्ल्यामुळे माझ्या बागेत डाऊनीचा कसलाही प्रादुर्भाव झाला नाही. मण्यांची साईज १८ मिमी+ मिळाली आणि यंदा विक्रमी एक्सपोर्ट दर मिळाला! - रमेश पाटील, चांदवड',
      true, true, 1, new Date().toISOString(), new Date().toISOString()
    ],
    [
      'serv_tomato',
      'टोमॅटो पीक सल्ला व कन्सल्टन्सी',
      'Tomato Crop Consultancy',
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1546470427-0d4db154ceb7?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1200&q=80',
      'टोमॅटो लागवडीपासून भरपूर तोडे मिळेपर्यंत परिपूर्ण मार्गदर्शन. रोपांची पुनर्लागवड, नागअळी व पांढरी माशी नियंत्रण, अर्ली व लेट ब्लाइट (करपा) प्रतिबंध, फुलोरा व फळधारणा वाढवण्यासाठी मायक्रोन्यूट्रियंट डोस आणि आकर्षक लाल रंगासाठी विशेष पोषण व्यवस्थापन.',
      'Complete guidance for tomato farming from transplanting to maximum pickings. Preventive measures against Leaf Minor, Whitefly, Early & Late Blight, micro-nutrient scheduling for flower retention, and optimal fruit weight.',
      ['• व्हायरस व पांढरी माशी प्रादुर्भावापासून १००% रक्षण', '• फुलगळ थांबवून जास्त फळधारणा व फुलोरा', '• फळांचा घट्टपणा व आकर्षक लाल रंगामुळे बाजारात चांगला दर', '• तोड्यांची संख्या वाढून दीर्घकाळ उत्पादन'].join('\\n'),
      'टोमॅटो पिकावर दरवर्षी करपा यायचा. स्वराज कन्सल्टन्सीचे शेड्यूल वापरल्याने झाडे शेवटपर्यंत हिरवीगार राहिली आणि २५ तोडे यशस्वीरीत्या झाले! - विठ्ठल शिंदे, कानमंडाळे',
      true, true, 2, new Date().toISOString(), new Date().toISOString()
    ],
    [
      'serv_pomegranate',
      'डाळिंब पीक सल्ला व कन्सल्टन्सी',
      'Pomegranate Crop Consultancy',
      'https://images.unsplash.com/photo-1541344999736-83eca872f241?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1541344999736-83eca872f241?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=80',
      'डाळिंब बागेत तेल्या (बॅक्टेरियल ब्लाइट), पिनहोल बोरर व मर रोगाचे खात्रीशीर व्यवस्थापन. बहार धरणे, कळी सेटिंग, फळांवर डाग पडू न देणे आणि चकाकणाऱ्या गडद लाल दाण्यांसाठी तज्ज्ञ कृषी सल्ला व खतांचे अचूक नियोजन.',
      'Specialized care for pomegranate orchards to prevent Bacterial Blight (Telya), Wilt, and Fruit Borer. Scientific bahar management, fruit setting, and canopy management for premium grade heavy arils.',
      ['• तेल्या व करपा रोगाचा प्रादुर्भाव रोखण्यासाठी प्रतिबंधक स्प्रे', '• फळांना तडे जाणे (Fruit Cracking) थांबवून आकर्षक रंग', '• कळी गळ रोखून ९५% पेक्षा जास्त फळधारणा सेटिंग', '• दर्जेदार एक्सपोर्ट ग्रेड डाळिंब उत्पादन'].join('\\n'),
      'माझ्या डाळिंब बागेत तेल्याची सुरुवात झाली होती, परंतु स्वराज कृषी केंद्राच्या तज्ज्ञ मार्गदर्शनामुळे वेळीच आळा बसला आणि उत्तम उत्पन्न निघाले! - समाधान बोरसे, उमराणे',
      true, true, 3, new Date().toISOString(), new Date().toISOString()
    ],
    [
      'serv_watermelon',
      'कलिंगड पीक सल्ला व कन्सल्टन्सी',
      'Watermelon Crop Consultancy',
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1589533610925-1cffc309ebaa?auto=format&fit=crop&w=1200&q=80',
      'कमी कालावधीत कलिंगडाचे विक्रमी उत्पादन घेण्यासाठी मल्चिंग, ठिबक सिंचन, विद्राव्य खतांचे वेळापत्रक व वेलींची निरोगी वाढ. भुरी, केवडा व फळमाशी नियंत्रणासाठी खास उपाययोजना आणि गोड व भरीव वजनाच्या फळांसाठी पोषण.',
      'High-yield watermelon cultivation with precision drip fertigation, silver-black mulching guidance, and Downey mildew prevention. Focus on fruit weight, sugar brix level, and early market arrival.',
      ['• मल्चिंग व ठिबकद्वारे खतांची ५०% बचत व जास्त उतार', '• फळमाशी व नागअळीचे प्रभावी व स्वस्त नियंत्रण', '• सरासरी फळांचे वजन ५ ते ८ किलोपर्यंत हमखास वाढ', '• उत्तम गोडी (Brix) व आकर्षक लाल रंग'].join('\\n'),
      'अवघ्या ६५ दिवसांत कलिंगडाचे एकरी २८ टन विक्रमी उत्पादन मिळाले! खतांचा डोस अगदी अचूक दिल्याने फळांना गोडी व वजन अप्रतिम मिळाले. - ज्ञानेश्वर ठाकरे, शिरसाणे',
      true, true, 4, new Date().toISOString(), new Date().toISOString()
    ]
  ];

  sheet.getRange(2, 1, services.length, 14).setValues(services);
}

function updateCustomerKhata(ss, bill) {
  const mobile = String(bill.customerMobile || bill.mobile || bill.Mobile || '').trim().replace(/\D/g, '').slice(-10);
  const name = String(bill.customerName || bill.name || bill.Name || bill.Customer_Name || '').trim();
  const address = String(bill.customerAddress || bill.address || bill.Address || '').trim();
  if (!mobile && !name) return;
  if (mobile) ensureCustomerUser(ss, mobile, name || 'ग्राहक');
  
  let custSheet = findCustomersSheet(ss) || ss.getSheetByName(TABS.CUSTOMERS);
  if (!custSheet) {
    initAllTabs(ss);
    custSheet = findCustomersSheet(ss) || ss.getSheetByName(TABS.CUSTOMERS);
  }
  if (!custSheet) return;
  
  const lastRow = custSheet.getLastRow();
  const total = Number(bill.totalAmount || bill.Total_Amount || 0);
  const paid = Number(bill.paidAmount || bill.Paid_Amount || 0);
  const bal = Number(bill.balanceAmount || bill.Balance_Amount || (total - paid) || 0);
  const billDate = bill.billDate || bill.Date || new Date().toISOString().split('T')[0];
  
  if (lastRow > 1) {
    const lastCol = custSheet.getLastColumn();
    const headers = custSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return String(h || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    });
    const mIdx = headers.findIndex(function(h) { return ['mobile', 'phone', 'contact'].indexOf(h) !== -1; });
    const nIdx = headers.findIndex(function(h) { return ['customername', 'name', 'farmername'].indexOf(h) !== -1; });
    const aIdx = headers.findIndex(function(h) { return ['address', 'village'].indexOf(h) !== -1; });
    const tbIdx = headers.findIndex(function(h) { return ['totalbills', 'bills'].indexOf(h) !== -1; });
    const tpIdx = headers.findIndex(function(h) { return ['totalpurchased', 'totalamount', 'purchased', 'amount'].indexOf(h) !== -1; });
    const tpaIdx = headers.findIndex(function(h) { return ['totalpaid', 'paidamount', 'paid'].indexOf(h) !== -1; });
    const buIdx = headers.findIndex(function(h) { return ['balanceudhaari', 'balance', 'udhaari', 'udhari', 'due'].indexOf(h) !== -1; });
    const lvIdx = headers.findIndex(function(h) { return ['lastvisit', 'date'].indexOf(h) !== -1; });

    const rows = custSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    for (let i = 0; i < rows.length; i++) {
      const rowMob = mIdx >= 0 ? String(rows[i][mIdx] || '').replace(/\D/g, '').slice(-10) : '';
      const rowName = nIdx >= 0 ? String(rows[i][nIdx] || '').trim().toLowerCase() : '';
      if ((mobile && rowMob === mobile) || (!mobile && name && rowName === name.toLowerCase())) {
        const r = i + 2;
        if (name && nIdx >= 0) custSheet.getRange(r, nIdx + 1).setValue(name);
        if (address && aIdx >= 0) custSheet.getRange(r, aIdx + 1).setValue(address);
        if (tbIdx >= 0) custSheet.getRange(r, tbIdx + 1).setValue(Number(rows[i][tbIdx] || 0) + 1);
        if (tpIdx >= 0) custSheet.getRange(r, tpIdx + 1).setValue(Number(rows[i][tpIdx] || 0) + total);
        if (tpaIdx >= 0) custSheet.getRange(r, tpaIdx + 1).setValue(Number(rows[i][tpaIdx] || 0) + paid);
        if (buIdx >= 0) custSheet.getRange(r, buIdx + 1).setValue(Number(rows[i][buIdx] || 0) + bal);
        if (lvIdx >= 0) custSheet.getRange(r, lvIdx + 1).setValue(billDate);
        return;
      }
    }
  }
  
  // Insert new customer
  custSheet.appendRow([
    mobile,
    name || '',
    address || '',
    1,
    total,
    paid,
    bal,
    billDate
  ]);
}

function ensureCustomerUser(ss, mobile, fullName) {
  const normalizedMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!normalizedMobile || normalizedMobile.length < 10) return;
  let sheet = ss.getSheetByName(TABS.USERS);
  if (!sheet) {
    initAllTabs(ss);
    sheet = ss.getSheetByName(TABS.USERS);
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keys = headers.map(normalizeHeader);
  const idColumn = keys.findIndex(key => key === 'id');
  const mobileColumn = keys.findIndex(key => key === 'mobile');
  const usernameColumn = keys.findIndex(key => key === 'username');
  const values = headers.map(header => {
    const key = normalizeHeader(header);
    if (key === 'id') return normalizedMobile;
    if (key === 'username') return normalizedMobile;
    if (key === 'password') return normalizedMobile;
    if (key === 'role' || key === 'type') return 'customer';
    if (key === 'fullname' || key === 'name' || key === 'customername') return fullName || 'ग्राहक';
    if (key === 'mobile') return normalizedMobile;
    if (key === 'createdat' || key === 'date') return new Date().toISOString();
    return '';
  });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (sheet.getLastRow() > 1) {
      const users = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
      const exists = users.some(row =>
        (idColumn >= 0 && String(row[idColumn]).replace(/\D/g, '').slice(-10) === normalizedMobile) ||
        (mobileColumn >= 0 && String(row[mobileColumn]).replace(/\D/g, '').slice(-10) === normalizedMobile) ||
        (usernameColumn >= 0 && String(row[usernameColumn]).trim().toLowerCase() === normalizedMobile)
      );
      if (exists) return;
    }
    sheet.appendRow(values);
  } finally {
    lock.releaseLock();
  }
}

// --------------------------------------------------------------------------
// 10. Update & Fetch Cached Stats for Ultra-Fast Dashboards
// --------------------------------------------------------------------------
function updateCachedStats(ss) {
  const statsSheet = ss.getSheetByName(TABS.STATS);
  if (!statsSheet) return;
  
  const billsSheet = ss.getSheetByName(TABS.BILLS);
  const invSheet = ss.getSheetByName(TABS.INVENTORY);
  const challansSheet = ss.getSheetByName(TABS.CHALLANS);
  
  let totalBills = 0;
  let totalSales = 0;
  let totalPaid = 0;
  let totalUdhaari = 0;
  
  getAllBillRecords(ss).forEach(function(bill) {
    totalBills++;
    totalSales += Number(getRecordValue(bill, 'Total_Amount') || 0);
    totalPaid += Number(getRecordValue(bill, 'Paid_Amount') || 0);
    totalUdhaari += Number(getRecordValue(bill, 'Balance_Amount') || 0);
  });
  
  let totalStockItems = 0;
  let totalStockValuation = 0;
  let lowStockCount = 0;
  
  if (invSheet && invSheet.getLastRow() > 1) {
    const headers = invSheet.getRange(1, 1, 1, invSheet.getLastColumn()).getValues()[0].map(normalizeHeader);
    const purchaseColumn = headers.indexOf('purchaseprice');
    const stockColumn = headers.findIndex(header => ['availablestock', 'currentstock', 'quantity', 'qty'].includes(header));
    const alertColumn = headers.indexOf('minalertqty');
    const invValues = invSheet.getRange(2, 1, invSheet.getLastRow() - 1, headers.length).getValues();
    totalStockItems = invValues.length;
    invValues.forEach(row => {
      const pPrice = purchaseColumn >= 0 ? Number(row[purchaseColumn] || 0) : 0;
      const stock = stockColumn >= 0 ? Number(row[stockColumn] || 0) : 0;
      const minAlert = alertColumn >= 0 ? Number(row[alertColumn] || 5) : 5;
      totalStockValuation += (pPrice * stock);
      if (stock <= minAlert) lowStockCount++;
    });
  }
  
  const totalChallans = challansSheet && challansSheet.getLastRow() > 1 ? (challansSheet.getLastRow() - 1) : 0;
  
  // Clear and rewrite Stats
  statsSheet.getRange('A2:D20').clearContent();
  const metrics = [
    ['total_bills', 'एकूण बिले', totalBills, new Date().toISOString()],
    ['total_sales', 'एकूण विक्री (रुपये)', totalSales, new Date().toISOString()],
    ['total_paid', 'एकूण जमा रक्कम (रुपये)', totalPaid, new Date().toISOString()],
    ['total_udhaari', 'एकूण येणे बाकी उधारी (रुपये)', totalUdhaari, new Date().toISOString()],
    ['total_stock_items', 'एकूण उत्पादने संख्या', totalStockItems, new Date().toISOString()],
    ['total_stock_valuation', 'एकूण स्टॉक मूल्य (रुपये)', totalStockValuation, new Date().toISOString()],
    ['low_stock_count', 'कमी स्टॉक असलेली उत्पादने', lowStockCount, new Date().toISOString()],
    ['total_challans', 'एकूण चालने संख्या', totalChallans, new Date().toISOString()]
  ];
  
  statsSheet.getRange(2, 1, metrics.length, 4).setValues(metrics);
}

function getStats(ss) {
  const statsSheet = ss.getSheetByName(TABS.STATS);
  if (!statsSheet || statsSheet.getLastRow() <= 1) {
    updateCachedStats(ss);
  }
  const lastRow = statsSheet.getLastRow();
  const values = statsSheet.getRange(2, 1, lastRow - 1, 4).getValues();
  let statsObj = {};
  values.forEach(row => {
    statsObj[row[0]] = row[2];
  });
  return { success: true, stats: statsObj };
}

// --------------------------------------------------------------------------
// 11. Authenticate User from Sheet
// --------------------------------------------------------------------------
function authenticateUser(ss, username, password) {
  const sheet = ss.getSheetByName(TABS.USERS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: false, error: 'No users configured in sheet' };
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columns = headers.map(normalizeHeader);
  const idColumn = columns.indexOf('id');
  const usernameColumn = columns.indexOf('username');
  const passwordColumn = columns.indexOf('password');
  const roleColumn = columns.findIndex(key => ['role', 'type'].includes(key));
  const nameColumn = columns.findIndex(key => ['fullname', 'name', 'customername'].includes(key));
  const mobileColumn = columns.indexOf('mobile');
  if ([idColumn, usernameColumn, passwordColumn, roleColumn].some(column => column < 0)) {
    return { success: false, error: 'Users sheet is missing a required authentication column.' };
  }
  const users = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  const u = String(username || '').trim().toLowerCase();
  const p = String(password || '').trim();
  
  for (let i = 0; i < users.length; i++) {
    const rowU = String(users[i][usernameColumn]).trim().toLowerCase();
    const rowP = String(users[i][passwordColumn]).trim();
    const rowMobile = mobileColumn >= 0 ? String(users[i][mobileColumn]).replace(/\D/g, '').slice(-10) : '';
    const rowId = idColumn >= 0 ? String(users[i][idColumn]).trim().toLowerCase() : '';
    
    if ((rowU === u || rowMobile === u || rowId === u) && rowP === p) {
      const user = {
        id: users[i][idColumn],
        username: users[i][usernameColumn],
        role: users[i][roleColumn],
        fullName: nameColumn >= 0 ? users[i][nameColumn] : '',
        mobile: mobileColumn >= 0 ? users[i][mobileColumn] : ''
      };
      const token = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
      const fingerprint = credentialFingerprint(p);
      const sessions = getAuthSessionsSheet(ss);
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        sessions.appendRow([
          sha256Hex(token),
          String(user.id),
          fingerprint,
          new Date().toISOString(),
          new Date().toISOString(),
          false
        ]);
      } finally {
        lock.releaseLock();
      }
      return {
        success: true,
        user,
        token
      };
    }
  }
  return { success: false, error: 'चुकीचा आयडी किंवा पासवर्ड!' };
}

function getAuthSessionsSheet(ss) {
  let sheet = ss.getSheetByName(TABS.AUTH_SESSIONS);
  if (!sheet) sheet = ss.insertSheet(TABS.AUTH_SESSIONS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Token_Hash', 'User_ID', 'Credential_Fingerprint', 'Created_At', 'Last_Validated_At', 'Revoked']);
  }
  if (!sheet.isSheetHidden()) sheet.hideSheet();
  return sheet;
}

function getSessionFingerprintSecret() {
  const properties = PropertiesService.getScriptProperties();
  let secret = properties.getProperty('SKSK_SESSION_FINGERPRINT_SECRET');
  if (!secret) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      secret = properties.getProperty('SKSK_SESSION_FINGERPRINT_SECRET');
      if (!secret) {
        secret = Utilities.getUuid() + Utilities.getUuid();
        properties.setProperty('SKSK_SESSION_FINGERPRINT_SECRET', secret);
      }
    } finally {
      lock.releaseLock();
    }
  }
  return secret;
}

function credentialFingerprint(password) {
  const signature = Utilities.computeHmacSha256Signature(
    String(password || ''),
    getSessionFingerprintSecret()
  );
  return Utilities.base64EncodeWebSafe(signature);
}

function sha256Hex(value) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
    Utilities.Charset.UTF_8
  ).map(function(byte) {
    const normalized = (byte + 256) % 256;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function validateAuthSession(ss, token) {
  if (!token) return { success: true, valid: false, reason: 'missing_token' };
  const sessions = getAuthSessionsSheet(ss);
  if (sessions.getLastRow() <= 1) return { success: true, valid: false, reason: 'session_missing' };

  const tokenHash = sha256Hex(token);
  const rows = sessions.getRange(2, 1, sessions.getLastRow() - 1, 6).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) !== tokenHash || rows[i][5] === true || String(rows[i][5]).toLowerCase() === 'true') continue;

    const users = ss.getSheetByName(TABS.USERS);
    if (!users || users.getLastRow() <= 1) {
      sessions.getRange(i + 2, 6).setValue(true);
      return { success: true, valid: false, reason: 'user_missing' };
    }
    const userHeaders = users.getRange(1, 1, 1, users.getLastColumn()).getValues()[0];
    const userColumns = userHeaders.map(normalizeHeader);
    const userIdColumn = userColumns.indexOf('id');
    const userPasswordColumn = userColumns.indexOf('password');
    const userUsernameColumn = userColumns.indexOf('username');
    const userRoleColumn = userColumns.indexOf('role');
    const userNameColumn = userColumns.findIndex(key => ['fullname', 'name', 'customername'].includes(key));
    const userMobileColumn = userColumns.indexOf('mobile');
    const userRows = users.getRange(2, 1, users.getLastRow() - 1, userHeaders.length).getValues();
    const userRow = userRows.find(function(row) {
      return userIdColumn >= 0 && String(row[userIdColumn]) === String(rows[i][1]);
    });
    if (!userRow || userPasswordColumn < 0 || credentialFingerprint(userRow[userPasswordColumn]) !== String(rows[i][2])) {
      sessions.getRange(i + 2, 6).setValue(true);
      return { success: true, valid: false, reason: 'credentials_changed' };
    }

    sessions.getRange(i + 2, 5).setValue(new Date().toISOString());
    return {
      success: true,
      valid: true,
      user: {
        id: userRow[userIdColumn],
        username: userUsernameColumn >= 0 ? userRow[userUsernameColumn] : '',
        role: userRoleColumn >= 0 ? userRow[userRoleColumn] : '',
        fullName: userNameColumn >= 0 ? userRow[userNameColumn] : '',
        mobile: userMobileColumn >= 0 ? userRow[userMobileColumn] : ''
      }
    };
  }
  return { success: true, valid: false, reason: 'session_missing' };
}

function changeUserPassword(ss, token, currentPassword, newPassword) {
  const current = String(currentPassword || '');
  const next = String(newPassword || '');
  if (!token || !current || next.length < 8) {
    return { success: false, error: 'Current password and a new password of at least 8 characters are required.' };
  }
  const session = validateAuthSession(ss, token);
  if (!session.valid || !session.user) return { success: false, error: 'Session expired. Please sign in again.' };

  const sheet = ss.getSheetByName(TABS.USERS);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: 'User account was not found.' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColumn = headers.findIndex(header => normalizeHeader(header) === 'id');
  const passwordColumn = headers.findIndex(header => normalizeHeader(header) === 'password');
  if (idColumn < 0 || passwordColumn < 0) return { success: false, error: 'Users sheet is missing ID or Password columns.' };

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  const index = rows.findIndex(row => String(row[idColumn]) === String(session.user.id));
  if (index < 0) return { success: false, error: 'User account was not found.' };
  if (String(rows[index][passwordColumn]) !== current) return { success: false, error: 'Current password is incorrect.' };
  sheet.getRange(index + 2, passwordColumn + 1).setValue(next);
  return { success: true, message: 'Password updated successfully.' };
}

function revokeAuthSession(ss, token) {
  if (!token) return { success: true, revoked: false };
  const sessions = getAuthSessionsSheet(ss);
  if (sessions.getLastRow() <= 1) return { success: true, revoked: false };

  const tokenHash = sha256Hex(token);
  const rows = sessions.getRange(2, 1, sessions.getLastRow() - 1, 6).getValues();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === tokenHash) {
        sessions.getRange(i + 2, 6).setValue(true);
        return { success: true, revoked: true };
      }
    }
  } finally {
    lock.releaseLock();
  }
  return { success: true, revoked: false };
}

// --------------------------------------------------------------------------
// 12. Bulk Sync from Frontend
// --------------------------------------------------------------------------
function saveProductRequest(ss, request) {
  const sheet = ss.getSheetByName(TABS.PRODUCT_REQUESTS);
  if (!sheet) initAllTabs(ss);
  const target = ss.getSheetByName(TABS.PRODUCT_REQUESTS);
  const id = 'REQ-' + new Date().getTime();
  target.appendRow([id, request.productName || '', request.shortDescription || '', request.usageDescription || '', new Date().toISOString(), 'New']);
  return { success: true, id: id };
}

function bulkSyncData(ss, data) {
  if (!data) return { success: false, error: 'No sync data' };
  initAllTabs(ss);
  
  const seeded = {};
  const seed = (tab, rows) => {
    const sheet = ss.getSheetByName(tab);
    if (!sheet || sheet.getLastRow() > 1 || !rows || !rows.length) { seeded[tab] = 0; return; }
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    seeded[tab] = rows.length;
  };
  const now = new Date().toISOString();
  seed(TABS.PRODUCTS, (data.products || []).map(p => [p.id || '', p.name || '', p.nameEn || p.name_en || '', p.categoryId || p.category_id || '', p.category || '', p.categoryEn || p.category_en || '', p.company || '', p.companyEn || p.company_en || '', Number(p.price || 0), p.pack || '', p.badge || '', p.image || '', p.short || '', p.description || '', p.usage || '', Array.isArray(p.crops) ? p.crops.join(', ') : (p.crops || ''), p.is_active !== false, Number(p.sort_order || 0), p.created_at || now, p.updated_at || now]));
  seed(TABS.CATEGORIES, (data.categories || []).map(c => [c.id || '', c.name || '', c.nameEn || c.name_en || '', c.is_active !== false, Number(c.sort_order || c.sortOrder || 0), c.created_at || now, c.updated_at || now]));
  seed(TABS.INVENTORY, (data.inventory || []).map(i => [i.id || '', i.name || '', i.category || '', i.subcategory || '', i.company || '', i.unit || '', Number(i.purchasePrice || i.purchase_price || 0), Number(i.sellingPrice || i.selling_price || 0), Number(i.availableStock || i.available_stock || 0), Number(i.minAlertQty || i.min_alert_qty || 0), i.updatedAt || i.updated_at || now, i.productId || i.product_id || i.id || '', i.nameEn || i.name_en || '', i.categoryEn || i.category_en || '', i.companyEn || i.company_en || '']));
  seed(TABS.PURCHASES, (data.purchases || []).map(p => [p.id || '', p.date || '', p.supplier || '', p.category || '', p.productName || p.product_name || '', Number(p.quantity || p.bulk_qty || 0), p.unit || '', Number(p.totalCost || p.total_cost || 0), Number(p.unitCost || p.unit_cost || 0), Number(p.sellingPrice || p.selling_price || 0), p.notes || '']));
  seed(TABS.BILLS, (data.bills || []).map(b => [b.billNo || b.bill_no || b.id || '', b.date || '', b.customerName || b.customer_name || '', b.mobile || '', b.address || '', Number(b.totalAmount || b.total_amount || 0), Number(b.paidAmount || b.paid_amount || 0), Number(b.balanceAmount || b.balance_amount || 0), b.paymentStatus || b.payment_status || '', b.paymentMode || b.payment_mode || '', JSON.stringify(b.items || []), b.notes || '', b.createdAt || b.created_at || now]));
  seed(TABS.CHALLANS, (data.challans || []).map(c => [c.challanNo || c.challan_no || c.id || '', c.date || '', c.customerName || c.customer_name || '', c.mobile || '', c.address || '', c.vehicleNo || c.vehicle_no || '', c.driverName || c.driver_name || '', c.status || '', JSON.stringify(c.items || []), c.remarks || '', c.convertedToBill || c.converted_to_bill || '']));
  seed(TABS.CUSTOMERS, (data.customers || []).map(c => [c.mobile || '', c.name || c.customerName || c.customer_name || '', c.address || '', Number(c.totalBills || c.total_bills || 0), Number(c.totalPurchased || c.total_purchased || 0), Number(c.totalPaid || c.total_paid || 0), Number(c.balance || c.balanceUdhaari || c.balance_udhari || 0), c.lastVisit || c.last_visit || '']));
  seed(TABS.USERS, (data.users || []).map(u => [u.id || '', u.username || '', u.password || '', u.role || '', u.fullName || u.full_name || '', u.mobile || '', u.createdAt || u.created_at || now]));
  seed(TABS.SETTINGS, (data.settings || []).map(s => [s.key || s.Key || '', s.value || s.Value || '', s.description || s.Description || '']));
  
  updateCachedStats(ss);
  return { success: true, seeded: seeded, message: 'Empty tabs initialized; tabs containing data were preserved.' };
  return { success: true, message: 'सर्व स्थानिक डेटा गुगल शीटमध्ये यशस्वीरीत्या सिंक झाला!' };
}
`;
