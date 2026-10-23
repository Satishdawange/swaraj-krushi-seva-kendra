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
  PRODUCT_REQUESTS: 'Product_Requests',
  AUTH_SESSIONS: 'Auth_Sessions'
};

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
    
    let result = { success: false, error: 'Unknown action' };
    
    switch (action) {
      case 'ping':
        result = {
          success: true,
          message: 'Swaraj KSK Google Sheets API is Online',
          timestamp: new Date().toISOString(),
          sheetName: ss.getName()
        };
        break;
        
      case 'initTabs':
        result = initAllTabs(ss);
        break;
        
      case 'getStats':
        result = getStats(ss);
        break;
        
      case 'getRecent':
        result = getRecentPaginated(ss, params.sheetName || TABS.BILLS, parseInt(params.page || 1), parseInt(params.limit || 10), params.search || '', params.category || '');
        break;
        
      case 'getAll':
        result = getAllRecords(ss, params.sheetName || TABS.INVENTORY);
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
    [TABS.INVENTORY]: ['ID', 'Name', 'Category', 'Subcategory', 'Company', 'Unit', 'Purchase_Price', 'Selling_Price', 'Available_Stock', 'Min_Alert_Qty', 'Updated_At', 'Product_ID', 'Name_EN', 'Category_EN', 'Company_EN'],
    [TABS.PURCHASES]: ['Lot_ID', 'Date', 'Supplier', 'Category', 'Product_Name', 'Bulk_Qty', 'Unit', 'Total_Cost', 'Unit_Cost', 'Selling_Price', 'Notes'],
    [TABS.BILLS]: ['Bill_No', 'Date', 'Customer_Name', 'Mobile', 'Address', 'Total_Amount', 'Paid_Amount', 'Balance_Amount', 'Payment_Status', 'Payment_Mode', 'Items_JSON', 'Notes', 'Created_At'],
    [TABS.CHALLANS]: ['Challan_No', 'Date', 'Customer_Name', 'Mobile', 'Address', 'Vehicle_No', 'Driver_Name', 'Status', 'Items_JSON', 'Remarks', 'Converted_To_Bill'],
    [TABS.CUSTOMERS]: ['Mobile', 'Customer_Name', 'Address', 'Total_Bills', 'Total_Purchased', 'Total_Paid', 'Balance_Udhaari', 'Last_Visit'],
    [TABS.USERS]: ['ID', 'Username', 'Password', 'Role', 'Full_Name', 'Mobile', 'Created_At'],
    [TABS.SETTINGS]: ['Key', 'Value', 'Description'],
    [TABS.PRODUCTS]: ['Product_ID', 'Name_MR', 'Name_EN', 'Category_ID', 'Category_MR', 'Category_EN', 'Company_MR', 'Company_EN', 'Price', 'Pack', 'Badge_MR', 'Image_URL', 'Short_MR', 'Description_MR', 'Usage_MR', 'Crops_MR', 'Is_Active', 'Sort_Order', 'Created_At', 'Updated_At'],
    [TABS.CATEGORIES]: ['Category_ID', 'Name_MR', 'Name_EN', 'Is_Active', 'Sort_Order', 'Created_At', 'Updated_At'],
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
  
  // Seed Default Stats
  updateCachedStats(ss);
  
  return { success: true, message: 'सर्व टॅब्स व हेडर यशस्वीरीत्या तयार झाले!' };
}

// --------------------------------------------------------------------------
// 2. High-speed Paginated Fetch (Default 10 recent records)
// --------------------------------------------------------------------------
function getRecentPaginated(ss, sheetName, page, limit, search, category) {
  if (sheetName === TABS.USERS) {
    return { success: false, error: 'Users records are not available through the public API' };
  }
  const sheet = ss.getSheetByName(sheetName);
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
  
  // Read all rows or read from bottom up
  const dataRange = sheet.getRange(2, 1, totalRows, lastCol).getValues();
  
  let records = [];
  for (let i = dataRange.length - 1; i >= 0; i--) {
    const row = dataRange[i];
    let obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    
    // Search filter if provided
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
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Sheet not found: ' + sheetName };
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return { success: true, data: [] };
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  const list = values.map(row => {
    let item = {};
    headers.forEach((h, idx) => {
      item[h] = row[idx];
    });
    return item;
  });
  
  return { success: true, data: list };
}

// --------------------------------------------------------------------------
// 4. Save Bill + Deduct Inventory + Update Customer Khata
// --------------------------------------------------------------------------
function saveBillRecord(ss, bill) {
  if (!bill) return { success: false, error: 'No bill data provided' };
  
  const sheet = ss.getSheetByName(TABS.BILLS);
  if (!sheet) initAllTabs(ss);
  
  const billNo = bill.billNo || ('SKSK-' + Date.now());
  const billDate = bill.billDate || new Date().toISOString().split('T')[0];
  const itemsJson = typeof bill.items === 'string' ? bill.items : JSON.stringify(bill.items || []);
  
  // Append to Bills Sheet
  const billRow = [
    billNo,
    billDate,
    bill.customerName || '',
    bill.customerMobile || '',
    bill.customerAddress || '',
    Number(bill.totalAmount || 0),
    Number(bill.paidAmount || 0),
    Number(bill.balanceAmount || 0),
    bill.paymentStatus || 'Fully Paid',
    bill.paymentMode || 'Cash',
    itemsJson,
    bill.notes || '',
    new Date().toISOString()
  ];
  sheet.appendRow(billRow);
  
  // Deduct Inventory Quantities
  if (Array.isArray(bill.items)) {
    const invSheet = ss.getSheetByName(TABS.INVENTORY);
    if (invSheet && invSheet.getLastRow() > 1) {
      const invData = invSheet.getRange(2, 1, invSheet.getLastRow() - 1, invSheet.getLastColumn()).getValues();
      bill.items.forEach(item => {
        const itemName = (item.name || '').trim().toLowerCase();
        const qtyUsed = Number(item.qty || 0);
        if (qtyUsed > 0) {
          for (let r = 0; r < invData.length; r++) {
            const stockName = String(invData[r][1] || '').trim().toLowerCase();
            if (stockName === itemName || String(invData[r][0]) === String(item.id)) {
              let currentStock = Number(invData[r][8] || 0);
              let newStock = Math.max(0, currentStock - qtyUsed);
              invSheet.getRange(r + 2, 9).setValue(newStock); // Column 9 is Available_Stock
              invSheet.getRange(r + 2, 11).setValue(new Date().toISOString());
              break;
            }
          }
        }
      });
    }
  }
  
  // Update Customer Khata
  updateCustomerKhata(ss, bill);
  
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
  const sheet = ss.getSheetByName(TABS.INVENTORY);
  if (!sheet) initAllTabs(ss);
  
  const id = item.id || ('INV-' + Date.now());
  const lastRow = sheet.getLastRow();
  
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
    const index = ids.indexOf(String(id));
    if (index !== -1) {
      // Update existing
      const r = index + 2;
      sheet.getRange(r, 2).setValue(item.name);
      sheet.getRange(r, 3).setValue(item.category);
      sheet.getRange(r, 4).setValue(item.subcategory);
      sheet.getRange(r, 5).setValue(item.company);
      sheet.getRange(r, 6).setValue(item.unit);
      sheet.getRange(r, 7).setValue(Number(item.purchasePrice || 0));
      sheet.getRange(r, 8).setValue(Number(item.sellingPrice || 0));
      sheet.getRange(r, 9).setValue(Number(item.availableStock || 0));
      sheet.getRange(r, 10).setValue(Number(item.minAlertQty || 5));
      sheet.getRange(r, 11).setValue(new Date().toISOString());
      return { success: true, message: 'स्टॉक अपडेट झाला', id: id };
    }
  }
  
  // Insert new
  sheet.appendRow([
    id,
    item.name,
    item.category || 'इतर',
    item.subcategory || '',
    item.company || '',
    item.unit || 'नग',
    Number(item.purchasePrice || 0),
    Number(item.sellingPrice || 0),
    Number(item.availableStock || 0),
    Number(item.minAlertQty || 5),
    new Date().toISOString()
  ]);
  
  return { success: true, message: 'नवीन उत्पादन इन्व्हेंटरीमध्ये जोडले गेले!', id: id };
}

// --------------------------------------------------------------------------
// 7. Save Bulk Purchase Lot
// --------------------------------------------------------------------------
function savePurchaseLot(ss, lot) {
  const sheet = ss.getSheetByName(TABS.PURCHASES);
  if (!sheet) initAllTabs(ss);
  
  const lotId = lot.lotId || ('LOT-' + Date.now());
  const qty = Number(lot.bulkQty || 1);
  const totalCost = Number(lot.totalCost || 0);
  const unitCost = qty > 0 ? (totalCost / qty) : totalCost;
  
  sheet.appendRow([
    lotId,
    lot.date || new Date().toISOString().split('T')[0],
    lot.supplier || '',
    lot.category || '',
    lot.productName || '',
    qty,
    lot.unit || 'नग',
    totalCost,
    unitCost,
    Number(lot.sellingPrice || 0),
    lot.notes || ''
  ]);
  
  // Also add or increment in Inventory
  const invSheet = ss.getSheetByName(TABS.INVENTORY);
  if (invSheet) {
    let found = false;
    if (invSheet.getLastRow() > 1) {
      const invValues = invSheet.getRange(2, 1, invSheet.getLastRow() - 1, 2).getValues();
      for (let r = 0; r < invValues.length; r++) {
        if (String(invValues[r][1]).trim().toLowerCase() === String(lot.productName).trim().toLowerCase()) {
          const curStock = Number(invSheet.getRange(r + 2, 9).getValue() || 0);
          invSheet.getRange(r + 2, 9).setValue(curStock + qty);
          invSheet.getRange(r + 2, 7).setValue(unitCost);
          if (lot.sellingPrice) invSheet.getRange(r + 2, 8).setValue(Number(lot.sellingPrice));
          invSheet.getRange(r + 2, 11).setValue(new Date().toISOString());
          found = true;
          break;
        }
      }
    }
    if (!found) {
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
  
  return { success: true, message: 'घाऊक खरेदी नोंद झाली व स्टॉक वाढवला गेला!', lotId: lotId };
}

// --------------------------------------------------------------------------
// 8. Adjust Stock (+ / -)
// --------------------------------------------------------------------------
function adjustStock(ss, id, delta, reason) {
  const sheet = ss.getSheetByName(TABS.INVENTORY);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: 'Inventory empty' };
  
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(r => String(r[0]));
  const index = ids.indexOf(String(id));
  if (index === -1) return { success: false, error: 'Product not found' };
  
  const r = index + 2;
  const current = Number(sheet.getRange(r, 9).getValue() || 0);
  const updated = Math.max(0, current + Number(delta));
  sheet.getRange(r, 9).setValue(updated);
  sheet.getRange(r, 11).setValue(new Date().toISOString());
  
  return { success: true, newStock: updated, message: 'स्टॉक यशस्वीरीत्या बदलला (' + reason + ')' };
}

// --------------------------------------------------------------------------
// 9. Update Customer Khata Helper
// --------------------------------------------------------------------------
function updateCustomerKhata(ss, bill) {
  const mobile = String(bill.customerMobile || '').trim();
  if (!mobile) return;
  
  const custSheet = ss.getSheetByName(TABS.CUSTOMERS);
  if (!custSheet) return;
  
  const lastRow = custSheet.getLastRow();
  const total = Number(bill.totalAmount || 0);
  const paid = Number(bill.paidAmount || 0);
  const bal = Number(bill.balanceAmount || 0);
  
  if (lastRow > 1) {
    const mobiles = custSheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
    const idx = mobiles.indexOf(mobile);
    if (idx !== -1) {
      const r = idx + 2;
      custSheet.getRange(r, 2).setValue(bill.customerName || custSheet.getRange(r, 2).getValue());
      custSheet.getRange(r, 3).setValue(bill.customerAddress || custSheet.getRange(r, 3).getValue());
      custSheet.getRange(r, 4).setValue(Number(custSheet.getRange(r, 4).getValue() || 0) + 1);
      custSheet.getRange(r, 5).setValue(Number(custSheet.getRange(r, 5).getValue() || 0) + total);
      custSheet.getRange(r, 6).setValue(Number(custSheet.getRange(r, 6).getValue() || 0) + paid);
      custSheet.getRange(r, 7).setValue(Number(custSheet.getRange(r, 7).getValue() || 0) + bal);
      custSheet.getRange(r, 8).setValue(bill.billDate || new Date().toISOString().split('T')[0]);
      return;
    }
  }
  
  // Insert new customer
  custSheet.appendRow([
    mobile,
    bill.customerName || '',
    bill.customerAddress || '',
    1,
    total,
    paid,
    bal,
    bill.billDate || new Date().toISOString().split('T')[0]
  ]);
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
  
  if (billsSheet && billsSheet.getLastRow() > 1) {
    const billValues = billsSheet.getRange(2, 6, billsSheet.getLastRow() - 1, 3).getValues();
    totalBills = billValues.length;
    billValues.forEach(row => {
      totalSales += Number(row[0] || 0);
      totalPaid += Number(row[1] || 0);
      totalUdhaari += Number(row[2] || 0);
    });
  }
  
  let totalStockItems = 0;
  let totalStockValuation = 0;
  let lowStockCount = 0;
  
  if (invSheet && invSheet.getLastRow() > 1) {
    const invValues = invSheet.getRange(2, 7, invSheet.getLastRow() - 1, 4).getValues();
    totalStockItems = invValues.length;
    invValues.forEach(row => {
      const pPrice = Number(row[0] || 0);
      const stock = Number(row[2] || 0);
      const minAlert = Number(row[3] || 5);
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
  const users = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  const u = String(username || '').trim().toLowerCase();
  const p = String(password || '').trim();
  
  for (let i = 0; i < users.length; i++) {
    const rowU = String(users[i][1]).trim().toLowerCase();
    const rowP = String(users[i][2]).trim();
    const rowMobile = String(users[i][5]).trim();
    
    if ((rowU === u || rowMobile === u) && rowP === p) {
      const user = {
        id: users[i][0],
        username: users[i][1],
        role: users[i][3],
        fullName: users[i][4],
        mobile: users[i][5]
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
    const userRows = users.getRange(2, 1, users.getLastRow() - 1, 6).getValues();
    const userRow = userRows.find(function(row) {
      return String(row[0]) === String(rows[i][1]);
    });
    if (!userRow || credentialFingerprint(userRow[2]) !== String(rows[i][2])) {
      sessions.getRange(i + 2, 6).setValue(true);
      return { success: true, valid: false, reason: 'credentials_changed' };
    }

    sessions.getRange(i + 2, 5).setValue(new Date().toISOString());
    return {
      success: true,
      valid: true,
      user: {
        id: userRow[0],
        username: userRow[1],
        role: userRow[3],
        fullName: userRow[4],
        mobile: userRow[5]
      }
    };
  }
  return { success: true, valid: false, reason: 'session_missing' };
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
