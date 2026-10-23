import { products as staticProducts } from "../data/products";
import {
  googleSheetsCategorySeed,
  googleSheetsProductSeed,
} from "../data/googleSheetsCatalog";
import { GOOGLE_APPS_SCRIPT_CODE } from "../utils/googleAppsScriptTemplate";
import ShopProp from "../config/shopProps";
import { filterSheetRows } from "../utils/sheetData";
import { clearDashboardMetricsCache, getDashboardMetricsCache, setDashboardMetricsCache } from "../utils/dashboardCache";

export { clearDashboardMetricsCache, getDashboardMetricsCache, setDashboardMetricsCache };

const STORAGE_KEYS = {
  SHEETS_CONFIG: "sksk_sheets_config",
  INVENTORY: "sksk_inventory_db",
  PURCHASES: "sksk_purchase_lots_db",
  BILLS: "sksk_bills_db",
  CHALLANS: "sksk_challans_db",
  CUSTOMERS: "sksk_customers_db",
  USERS: "sksk_users_db",
  STATS: "sksk_cached_stats",
};

const DEFAULT_GOOGLE_SHEETS_API_URL =
  "https://script.google.com/macros/s/AKfycbxFuQ3TatmFB7jrVPcmjI1RF70HN_wpPtP_Wb3XA_Cfe8kitxFuJ95boUZA5Ac3oqklug/exec";

// Default initial inventory seeded from products.js
function getInitialInventory() {
  return staticProducts.map((p, idx) => ({
    id: p.id || `inv-${idx + 1}`,
    name: p.name,
    nameEn: p.nameEn || "",
    category: p.category || "इतर",
    subcategory: p.crops || "कृषी उत्पादने",
    company: p.company || "स्वराज अ‍ॅग्रो",
    unit:
      p.pack?.includes("ml") || p.pack?.includes("L")
        ? "लिटर/मिली"
        : p.pack?.includes("kg")
          ? "किलो"
          : "नग",
    purchasePrice: 0,
    sellingPrice: Number(p.price || 500),
    availableStock: 0,
    minAlertQty: 10,
    updatedAt: new Date().toISOString(),
  }));
}

// LocalStorage helpers
function readStorage(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Error reading localStorage for key ${key}:`, e);
    return defaultValue;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing localStorage for key ${key}:`, e);
  }
}

// Initialize local DB on first boot if empty
export function initLocalDatabase() {
  if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
    writeStorage(STORAGE_KEYS.INVENTORY, getInitialInventory());
  }
  localStorage.removeItem(STORAGE_KEYS.USERS);
  if (!localStorage.getItem(STORAGE_KEYS.BILLS)) {
    writeStorage(STORAGE_KEYS.BILLS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CHALLANS)) {
    writeStorage(STORAGE_KEYS.CHALLANS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PURCHASES)) {
    writeStorage(STORAGE_KEYS.PURCHASES, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    writeStorage(STORAGE_KEYS.CUSTOMERS, {});
  }
}

// Auto-run initialization
initLocalDatabase();

// -----------------------------------------------------------------------------
// Configuration & Connection Management
// -----------------------------------------------------------------------------
export function getGoogleSheetsConfig() {
  const stored = readStorage(STORAGE_KEYS.SHEETS_CONFIG, null);
  const envUrl =
    import.meta.env.VITE_GOOGLE_SHEETS_API_URL || DEFAULT_GOOGLE_SHEETS_API_URL;
  return {
    webAppUrl: stored?.webAppUrl || envUrl || "",
    sheetId: stored?.sheetId || "",
    autoSync: stored?.autoSync ?? true,
    lastConnected: stored?.lastConnected || null,
    status: stored?.status || "disconnected", // 'connected' | 'error' | 'disconnected'
  };
}

export function saveGoogleSheetsConfig(config) {
  const current = getGoogleSheetsConfig();
  const urlChanged =
    typeof config.webAppUrl === "string" &&
    config.webAppUrl.trim() !== current.webAppUrl;
  const updated = {
    ...current,
    ...config,
    ...(urlChanged && config.status === undefined
      ? { status: "disconnected", lastConnected: null }
      : {}),
  };
  writeStorage(STORAGE_KEYS.SHEETS_CONFIG, updated);
  window.dispatchEvent(new CustomEvent("sksk-sheets-config-change", { detail: updated }));
  return updated;
}

export async function fetchGoogleSheetRecords(sheetName) {
  const url = getGoogleSheetsConfig().webAppUrl.trim();
  if (!url) throw new Error("Google Apps Script Web App URL is not configured.");

  const query = new URLSearchParams({ action: "getAll", sheetName });
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}${query}`, {
    method: "GET",
    mode: "cors",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google Sheets request failed (${response.status}).`);

  const result = await response.json();
  if (!result.success) throw new Error(result.error || `Could not read ${sheetName}.`);
  return Array.isArray(result.data) ? result.data : [];
}

async function sendGoogleSheetsAuthAction(action, data) {
  const url = getGoogleSheetsConfig().webAppUrl.trim();
  if (!url) throw new Error("Google Apps Script Web App URL is not configured.");

  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...data }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google Sheets authentication failed (${response.status}).`);
  }
  return response.json();
}

export async function loginWithGoogleSheets(username, password) {
  const result = await sendGoogleSheetsAuthAction("login", { username, password });
  if (result.success && result.user && !result.token) {
    throw new Error("Google Apps Script जुनी आवृत्ती आहे. Admin/Staff login सुरू करण्यासाठी नवीन session-enabled script deploy करा.");
  }
  if (!result.success || !result.user || !result.token) {
    throw new Error(result.error || "चुकीचा आयडी किंवा पासवर्ड! कृपया पुन्हा तपासा.");
  }
  return { user: result.user, token: result.token };
}

export async function validateGoogleSheetsSession(token) {
  if (!token) return { valid: false, reason: "missing_token" };
  const result = await sendGoogleSheetsAuthAction("validateSession", { token });
  if (!result.success) {
    if (/invalid action/i.test(result.error || "")) {
      throw new Error("Google Apps Script जुनी आवृत्ती आहे. नवीन session-enabled script deploy करा.");
    }
    throw new Error(result.error || "सत्राची पडताळणी करता आली नाही.");
  }
  return { valid: Boolean(result.valid), user: result.user, reason: result.reason };
}

export async function logoutGoogleSheetsSession(token) {
  if (!token) return;
  const result = await sendGoogleSheetsAuthAction("logout", { token });
  if (!result.success) {
    throw new Error(result.error || "सत्र बंद करता आले नाही.");
  }
}

export async function sendGoogleSheetsAction(action, data) {
  const url = getGoogleSheetsConfig().webAppUrl.trim();
  if (!url) throw new Error("Google Apps Script Web App URL is not configured.");

  await fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, data }),
  });
  return { success: true, sent: true };
}

export async function testGoogleSheetsConnection(webAppUrl) {
  const url = (webAppUrl || getGoogleSheetsConfig().webAppUrl || "").trim();
  if (!url) {
    return {
      success: false,
      message: "गुगल ॲप्स स्क्रिप्ट वेब ॲप URL प्रविष्ट करा.",
    };
  }

  const startTime = performance.now();
  try {
    const res = await fetch(
      `${url}${url.includes("?") ? "&" : "?"}action=ping`,
      {
        method: "GET",
        mode: "cors",
      },
    );
    const duration = Math.round(performance.now() - startTime);

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const data = await res.json();
    if (data.success) {
      saveGoogleSheetsConfig({
        webAppUrl: url,
        lastConnected: new Date().toISOString(),
        status: "connected",
      });
      return {
        success: true,
        message: "Google Sheets जोडणी यशस्वी झाली!",
        latencyMs: duration,
        sheetName: data.sheetName || "Swaraj KSK Sheet",
      };
    } else {
      throw new Error(data.error || "अज्ञात त्रुटी आली.");
    }
  } catch (err) {
    saveGoogleSheetsConfig({ status: "error" });
    return {
      success: false,
      message: `जोडणी अयशस्वी: ${err.message}. कृपया Web App permissions ("Anyone" can access) तपासा.`,
      error: err.toString(),
    };
  }
}

export async function refreshGoogleSheetsData() {
  const connection = await testGoogleSheetsConnection();
  if (!connection.success) {
    throw new Error(connection.message);
  }

  const sheetNames = [
    "Products",
    "Categories",
    "Inventory",
    "Purchase_Lots",
    "Bills",
    "Challans",
    "Customers",
    "Settings",
    "Stats",
    "Product_Requests",
  ];
  const records = await Promise.all(
    sheetNames.map(async (sheetName) => [
      sheetName,
      await fetchGoogleSheetRecords(sheetName),
    ]),
  );
  const refreshedAt = new Date().toISOString();
  saveGoogleSheetsConfig({ status: "connected", lastSyncAt: refreshedAt });

  const summary = Object.fromEntries(
    records.map(([sheetName, rows]) => [sheetName, rows.length]),
  );
  window.dispatchEvent(
    new CustomEvent("sksk-sheets-data-refreshed", {
      detail: { refreshedAt, summary },
    }),
  );

  return { refreshedAt, summary };
}

// -----------------------------------------------------------------------------
// Paginated Fetching (10 Records at a time for high speed)
// -----------------------------------------------------------------------------
export async function fetchRecentRecords(
  sheetName,
  { page = 1, limit = 10, search = "", category = "", filter = null } = {},
) {
  const config = getGoogleSheetsConfig();
  const isOnline = !!config.webAppUrl;

  // If connected to Google Sheets, attempt remote API fetch
  if (isOnline) {
    try {
      // Category filters must run before pagination. Fetch the full inventory so
      // older deployed Apps Script versions (without a category parameter) work too.
      if (category || filter) {
        let allItems = filterSheetRows(await fetchGoogleSheetRecords(sheetName), { search, category });
        if (typeof filter === "function") allItems = allItems.filter(filter);
        const total = allItems.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const validPage = Math.max(1, Math.min(page, totalPages));
        return {
          items: allItems.slice((validPage - 1) * limit, validPage * limit),
          total,
          page: validPage,
          limit,
          totalPages,
          isLive: true,
        };
      }

      const qParams = new URLSearchParams({
        sheetName: sheetName,
        page: String(page),
        limit: String(limit),
        search: search || "",
        category: category || "",
      });

      const res = await fetch(
        `${config.webAppUrl}${config.webAppUrl.includes("?") ? "&" : "?"}action=getRecent&${qParams.toString()}`,
      );
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          return {
            items: result.data || [],
            total: result.total || 0,
            page: result.page || page,
            limit: result.limit || limit,
            totalPages: result.totalPages || 1,
            isLive: true,
          };
        }
      }
    } catch (e) {
      console.warn(
        "Google Sheets live fetch failed, falling back to local cached data:",
        e,
      );
    }
  }

  // Local Cached / Offline Fallback with instant pagination
  let items = [];
  if (sheetName === "Bills") {
    items = readStorage(STORAGE_KEYS.BILLS, []);
  } else if (sheetName === "Challans") {
    items = readStorage(STORAGE_KEYS.CHALLANS, []);
  } else if (sheetName === "Inventory") {
    items = readStorage(STORAGE_KEYS.INVENTORY, []);
  } else if (sheetName === "Purchase_Lots") {
    items = readStorage(STORAGE_KEYS.PURCHASES, []);
  } else if (sheetName === "Customers") {
    const custMap = readStorage(STORAGE_KEYS.CUSTOMERS, {});
    items = Object.values(custMap);
  } else if (sheetName === "Users") {
    items = readStorage(STORAGE_KEYS.USERS, []);
  }

  // Search filter
  items = filterSheetRows(items, { search, category });

  // Custom filter callback
  if (typeof filter === "function") {
    items = items.filter(filter);
  }

  // Chronological sort: newest first
  items.sort((a, b) => {
    const timeA = new Date(
      a.createdAt || a.date || a.billDate || a.updatedAt || 0,
    ).getTime();
    const timeB = new Date(
      b.createdAt || b.date || b.billDate || b.updatedAt || 0,
    ).getTime();
    return timeB - timeA;
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const validPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (validPage - 1) * limit;
  const paginatedItems = items.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page: validPage,
    limit,
    totalPages,
    isLive: false,
  };
}

// -----------------------------------------------------------------------------
// Inventory Management & Stock Operations
// -----------------------------------------------------------------------------
export function getAllInventoryItems() {
  return readStorage(STORAGE_KEYS.INVENTORY, getInitialInventory());
}

export function saveInventoryItemLocal(item) {
  const list = getAllInventoryItems();
  const id = item.id || `inv-${Date.now()}`;
  const index = list.findIndex(
    (i) => i.id === id || i.name?.toLowerCase() === item.name?.toLowerCase(),
  );

  const fullItem = {
    ...item,
    id,
    purchasePrice: Number(item.purchasePrice || 0),
    sellingPrice: Number(item.sellingPrice || 0),
    availableStock: Number(item.availableStock || 0),
    minAlertQty: Number(item.minAlertQty || 5),
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    list[index] = { ...list[index], ...fullItem };
  } else {
    list.unshift(fullItem);
  }

  writeStorage(STORAGE_KEYS.INVENTORY, list);

  // Sync to Google Sheets if connected
  syncItemToSheets("saveInventoryItem", fullItem);

  return fullItem;
}

export function adjustInventoryStock(
  itemId,
  delta,
  reason = "मॅन्युअल ऍडजस्टमेंट",
) {
  const list = getAllInventoryItems();
  const item = list.find((i) => i.id === itemId);
  if (!item) return null;

  const oldStock = Number(item.availableStock || 0);
  const newStock = Math.max(0, oldStock + Number(delta));
  item.availableStock = newStock;
  item.updatedAt = new Date().toISOString();

  writeStorage(STORAGE_KEYS.INVENTORY, list);

  syncItemToSheets("adjustStock", { id: itemId, delta, reason });
  return item;
}

// Record Bulk Purchase Lot & Update Stock
export function recordBulkPurchaseLot(lotData) {
  const lots = readStorage(STORAGE_KEYS.PURCHASES, []);
  const lotId = lotData.lotId || `LOT-${Date.now()}`;
  const qty = Number(lotData.bulkQty || 1);
  const totalCost = Number(lotData.totalCost || 0);
  const unitCost =
    qty > 0 ? Math.round((totalCost / qty) * 100) / 100 : totalCost;

  const lotRecord = {
    lotId,
    date: lotData.date || new Date().toISOString().split("T")[0],
    supplier: lotData.supplier || "डायरेक्ट खरेदी",
    category: lotData.category || "इतर",
    subcategory: lotData.subcategory || "",
    productName: lotData.productName || "",
    bulkQty: qty,
    unit: lotData.unit || "नग",
    totalCost,
    unitCost,
    sellingPrice: Number(lotData.sellingPrice || unitCost * 1.15),
    notes: lotData.notes || "",
    createdAt: new Date().toISOString(),
  };

  lots.unshift(lotRecord);
  writeStorage(STORAGE_KEYS.PURCHASES, lots);

  // Increment Inventory stock
  const inventory = getAllInventoryItems();
  const existing = inventory.find(
    (i) =>
      i.name?.trim().toLowerCase() ===
      lotRecord.productName.trim().toLowerCase(),
  );

  if (existing) {
    existing.availableStock = Number(existing.availableStock || 0) + qty;
    existing.purchasePrice = unitCost;
    if (lotRecord.sellingPrice) existing.sellingPrice = lotRecord.sellingPrice;
    existing.updatedAt = new Date().toISOString();
  } else {
    inventory.unshift({
      id: `inv-${Date.now()}`,
      name: lotRecord.productName,
      category: lotRecord.category,
      subcategory: lotRecord.subcategory,
      company: lotRecord.supplier,
      unit: lotRecord.unit,
      purchasePrice: unitCost,
      sellingPrice: lotRecord.sellingPrice,
      availableStock: qty,
      minAlertQty: 10,
      updatedAt: new Date().toISOString(),
    });
  }
  writeStorage(STORAGE_KEYS.INVENTORY, inventory);

  // Sync to sheets
  syncItemToSheets("savePurchaseLot", lotRecord);

  return lotRecord;
}

// -----------------------------------------------------------------------------
// Billing System with Live Inventory Deduction & Khata Updates
// -----------------------------------------------------------------------------
export function saveBillWithInventoryDeduction(billData) {
  const bills = readStorage(STORAGE_KEYS.BILLS, []);
  const billNo = billData.billNo || `SKSK-${Date.now()}`;

  const total = Number(billData.totalAmount || 0);
  const paid = Number(
    billData.paidAmount ?? (billData.paymentStatus === "Not Paid" ? 0 : total),
  );
  const balance = Math.max(0, total - paid);

  const newBill = {
    ...billData,
    billNo,
    totalAmount: total,
    paidAmount: paid,
    balanceAmount: balance,
    paymentStatus:
      billData.paymentStatus ||
      (balance === 0 ? "Fully Paid" : paid > 0 ? "Half Paid" : "Not Paid"),
    paymentMode: billData.paymentMode || "Cash",
    createdAt: billData.createdAt || new Date().toISOString(),
    billDate: billData.billDate || new Date().toISOString().split("T")[0],
  };

  bills.unshift(newBill);
  writeStorage(STORAGE_KEYS.BILLS, bills);

  // 1. Live Inventory Deduction: deduct used qty from stock
  const inventory = getAllInventoryItems();
  if (Array.isArray(billData.items)) {
    billData.items.forEach((item) => {
      const name = (item.name || "").trim().toLowerCase();
      const qtyUsed = Number(item.qty || 0);
      if (qtyUsed > 0) {
        const found = inventory.find(
          (i) => i.name?.trim().toLowerCase() === name || i.id === item.id,
        );
        if (found) {
          found.availableStock = Math.max(
            0,
            Number(found.availableStock || 0) - qtyUsed,
          );
          found.updatedAt = new Date().toISOString();
        }
      }
    });
    writeStorage(STORAGE_KEYS.INVENTORY, inventory);
  }

  // 2. Customer Directory / Khata Update
  const mobile = String(billData.customerMobile || "")
    .replace(/\D/g, "")
    .slice(-10);
  if (mobile) {
    const customers = readStorage(STORAGE_KEYS.CUSTOMERS, {});
    const existingCust = customers[mobile] || {
      mobile,
      customerName: billData.customerName || "",
      customerAddress: billData.customerAddress || "",
      totalBills: 0,
      totalPurchased: 0,
      totalPaid: 0,
      balanceUdhaari: 0,
      lastVisit: new Date().toISOString().split("T")[0],
    };

    existingCust.customerName =
      billData.customerName || existingCust.customerName;
    existingCust.customerAddress =
      billData.customerAddress || existingCust.customerAddress;
    existingCust.totalBills = Number(existingCust.totalBills || 0) + 1;
    existingCust.totalPurchased =
      Number(existingCust.totalPurchased || 0) + total;
    existingCust.totalPaid = Number(existingCust.totalPaid || 0) + paid;
    existingCust.balanceUdhaari =
      Number(existingCust.balanceUdhaari || 0) + balance;
    existingCust.lastVisit = newBill.billDate;

    customers[mobile] = existingCust;
    writeStorage(STORAGE_KEYS.CUSTOMERS, customers);
  }

  // 3. Sync to Google Sheets if connected
  syncItemToSheets("saveBill", newBill);

  return newBill;
}

// -----------------------------------------------------------------------------
// Delivery Challan System
// -----------------------------------------------------------------------------
export function saveDeliveryChallan(challanData) {
  const challans = readStorage(STORAGE_KEYS.CHALLANS, []);
  const challanNo =
    challanData.challanNo || `CH-${Date.now().toString().slice(-8)}`;

  const newChallan = {
    ...challanData,
    challanNo,
    date: challanData.date || new Date().toISOString().split("T")[0],
    status: challanData.status || "Dispatched",
    items: challanData.items || [],
    convertedToBill: !!challanData.convertedToBill,
    createdAt: new Date().toISOString(),
  };

  // Optional: deduct stock if marked in challan
  if (challanData.deductInventory && Array.isArray(challanData.items)) {
    const inventory = getAllInventoryItems();
    challanData.items.forEach((item) => {
      const name = (item.name || "").trim().toLowerCase();
      const qty = Number(item.qty || 0);
      const found = inventory.find(
        (i) => i.name?.trim().toLowerCase() === name || i.id === item.id,
      );
      if (found) {
        found.availableStock = Math.max(
          0,
          Number(found.availableStock || 0) - qty,
        );
        found.updatedAt = new Date().toISOString();
      }
    });
    writeStorage(STORAGE_KEYS.INVENTORY, inventory);
  }

  challans.unshift(newChallan);
  writeStorage(STORAGE_KEYS.CHALLANS, challans);

  syncItemToSheets("saveChallan", newChallan);

  return newChallan;
}

// -----------------------------------------------------------------------------
// Dashboard Analytics & KPI Metrics
// -----------------------------------------------------------------------------
export async function getDashboardMetrics() {
  const readNumber = (row, ...keys) => {
    for (const key of keys) if (row?.[key] !== undefined && row[key] !== "") return Number(row[key]) || 0;
    return 0;
  };
  const readValue = (row, ...keys) => {
    for (const key of keys) if (row?.[key] !== undefined && row[key] !== "") return row[key];
    return "";
  };
  const useGoogleSheets = Boolean(getGoogleSheetsConfig().webAppUrl.trim());
  const [sheetBills, sheetInventory, sheetChallans, sheetCustomers] = useGoogleSheets
    ? await Promise.all([
        fetchGoogleSheetRecords("Bills"),
        fetchGoogleSheetRecords("Inventory"),
        fetchGoogleSheetRecords("Challans"),
        fetchGoogleSheetRecords("Customers"),
      ])
    : [[], [], [], []];
  const billsSource = useGoogleSheets ? sheetBills : readStorage(STORAGE_KEYS.BILLS, []);
  const inventorySource = useGoogleSheets ? sheetInventory : getAllInventoryItems();
  const challansSource = useGoogleSheets ? sheetChallans : readStorage(STORAGE_KEYS.CHALLANS, []);
  const customerSource = useGoogleSheets ? sheetCustomers : Object.values(readStorage(STORAGE_KEYS.CUSTOMERS, {}));
  const bills = billsSource.map((b) => {
    let items = b.items || b.Items_JSON || b.items_json || [];
    if (typeof items === "string") { try { items = JSON.parse(items); } catch { items = []; } }
    return {
      ...b,
      billNo: readValue(b, "Bill_No", "billNo", "bill_no", "id"),
      billDate: readValue(b, "Date", "billDate", "date", "Created_At", "createdAt"),
      totalAmount: readNumber(b, "Total_Amount", "totalAmount", "total_amount"),
      paidAmount: readNumber(b, "Paid_Amount", "paidAmount", "paid_amount"),
      balanceAmount: readNumber(b, "Balance_Amount", "balanceAmount", "balance_amount"),
      customerName: readValue(b, "Customer_Name", "customerName", "customer_name"),
      items: Array.isArray(items) ? items : [],
    };
  });
  const inventory = inventorySource.map((item) => ({
    ...item,
    name: readValue(item, "Name", "name", "Name_MR"),
    category: readValue(item, "Category", "category", "Category_MR", "Category_EN"),
    purchasePrice: readNumber(item, "Purchase_Price", "purchasePrice", "purchase_price"),
    availableStock: readNumber(item, "Available_Stock", "availableStock", "available_stock", "Stock", "Quantity"),
    minAlertQty: readNumber(item, "Min_Alert_Qty", "minAlertQty", "min_alert_qty") || 10,
  }));
  const challans = challansSource;
  const customers = customerSource.map((c) => ({
    ...c,
    customerName: readValue(c, "Customer_Name", "customerName", "customer_name"),
    mobile: readValue(c, "Mobile", "mobile", "mobile_number"),
    customerAddress: readValue(c, "Address", "customerAddress", "customer_address"),
    totalPurchased: readNumber(c, "Total_Purchased", "totalPurchased", "total_purchased"),
    balanceUdhaari: readNumber(c, "Balance_Udhaari", "balanceUdhaari", "balance_udhari"),
  }));

  let totalSales = 0;
  let totalPaid = 0;
  let totalUdhaari = 0;
  let todaySales = 0;
  const todayStr = new Date().toISOString().split("T")[0];

  bills.forEach((b) => {
    const t = Number(b.totalAmount || 0);
    const p = Number(b.paidAmount || 0);
    const bal = Number(b.balanceAmount || 0);
    totalSales += t;
    totalPaid += p;
    totalUdhaari += bal;

    if (b.billDate === todayStr) {
      todaySales += t;
    }
  });

  let totalStockValuation = 0;
  let lowStockCount = 0;
  const lowStockItems = [];

  inventory.forEach((item) => {
    const cost = Number(item.purchasePrice || 0);
    const stock = Number(item.availableStock || 0);
    const minAlert = Number(item.minAlertQty || 10);
    totalStockValuation += cost * stock;

    if (stock <= minAlert) {
      lowStockCount++;
      lowStockItems.push(item);
    }
  });

  // Udhaari list (Customers with pending balance > 0)
  const pendingKhata = customers
    .filter((c) => Number(c.balanceUdhaari) > 0)
    .sort((a, b) => Number(b.balanceUdhaari) - Number(a.balanceUdhaari));

  return {
    totalSales,
    totalPaid,
    totalUdhaari,
    todaySales,
    totalBills: bills.length,
    totalChallans: challans.length,
    totalInventoryProducts: inventory.length,
    totalStockValuation,
    lowStockCount,
    lowStockItems,
    pendingKhata,
    totalCustomers: customers.length,
    bills,
    inventory,
    categories: [...new Set(inventory.map((item) => item.category).filter(Boolean))].sort(),
  };
}

// -----------------------------------------------------------------------------
// Asynchronous Google Sheets Background Sync Helper
// -----------------------------------------------------------------------------
async function syncItemToSheets(action, payload) {
  const config = getGoogleSheetsConfig();
  if (config.status !== "connected" || !config.webAppUrl || !config.autoSync) {
    return;
  }

  try {
    await fetch(config.webAppUrl, {
      method: "POST",
      mode: "no-cors", // Apps Script cross-origin writes must avoid a CORS preflight.
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action,
        data: payload,
      }),
    });
  } catch (err) {
    console.warn(`Background sync error for action ${action}:`, err);
  }
}

// One-click Export Local Data to Google Sheet
export async function exportAllToGoogleSheet(webAppUrl) {
  const url = (webAppUrl || getGoogleSheetsConfig().webAppUrl || "").trim();
  if (!url) throw new Error("Web App URL प्रविष्ट करा.");

  const payload = {
    products: googleSheetsProductSeed,
    categories: googleSheetsCategorySeed,
    inventory: getAllInventoryItems(),
    purchases: readStorage(STORAGE_KEYS.PURCHASES, []),
    bills: readStorage(STORAGE_KEYS.BILLS, []),
    challans: readStorage(STORAGE_KEYS.CHALLANS, []),
    customers: Object.values(readStorage(STORAGE_KEYS.CUSTOMERS, {})),
    users: readStorage(STORAGE_KEYS.USERS, []),
    settings: [
      { key: "shop_name", value: ShopProp.name, description: "Shop display name" },
      { key: "full_name", value: ShopProp.fullName, description: "Shop Marathi name" },
      { key: "owner_name", value: ShopProp.ownerName, description: "Proprietor" },
      { key: "phone", value: ShopProp.phone, description: "Contact number" },
      { key: "whatsapp", value: ShopProp.whatsapp, description: "WhatsApp number" },
      { key: "address", value: ShopProp.address, description: "Shop address" },
      { key: "pincode", value: ShopProp.pincode, description: "Postal code" },
    ],
  };

  await fetch(url, {
    method: "POST",
    mode: "no-cors", // Apps Script does not reliably support cross-origin preflight requests.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "syncAll",
      data: payload,
    }),
  });

  // no-cors returns an opaque response, so the browser cannot read the script's
  // result. A resolved fetch confirms the request was sent, not that Sheets saved it.
  return {
    success: true,
    message: "Sync request sent to Google Sheets. Check the sheet to confirm the data was saved.",
  };
}

// Return raw Google Apps Script template for the Admin UI copy button
export function getScriptTemplateCode() {
  return GOOGLE_APPS_SCRIPT_CODE;
}
