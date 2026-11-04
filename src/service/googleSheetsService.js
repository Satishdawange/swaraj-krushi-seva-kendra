import { products as staticProducts } from "../data/products";
import {
  googleSheetsCategorySeed,
  googleSheetsProductSeed,
} from "../data/googleSheetsCatalog";
import { GOOGLE_APPS_SCRIPT_CODE } from "../utils/googleAppsScriptTemplate";
import ShopProp from "../config/shopProps";
import { filterSheetRows, normalizeInventoryRow } from "../utils/sheetData";
import { buildDashboardAnalytics } from "../utils/dashboardAnalytics";
import {
  clearDashboardMetricsCache,
  getDashboardMetricsCache,
  setDashboardMetricsCache,
} from "../utils/dashboardCache";
import { initialConsultancyServices, DEFAULT_SERVICE_IMAGE } from "../data/consultancyServices";

export {
  clearDashboardMetricsCache,
  getDashboardMetricsCache,
  setDashboardMetricsCache,
};

export const STORAGE_KEYS = {
  SHEETS_CONFIG: "sksk_sheets_config",
  INVENTORY: "sksk_inventory_db",
  PURCHASES: "sksk_purchase_lots_db",
  BILLS: "sksk_bills_db",
  CHALLANS: "sksk_challans_db",
  CUSTOMERS: "sksk_customers_db",
  USERS: "sksk_users_db",
  STATS: "sksk_cached_stats",
  SERVICES: "sksk_services_db",
  CONSULTANCY_CUSTOMERS: "sksk_consultancy_customers_db",
};
const AUTH_TOKEN_STORAGE_KEY = "sksk_auth_session_token";

export const DEFAULT_GOOGLE_SHEETS_API_URL =
  "https://script.google.com/macros/s/AKfycbxFuQ3TatmFB7jrVPcmjI1RF70HN_wpPtP_Wb3XA_Cfe8kitxFuJ95boUZA5Ac3oqklug/exec";
const REQUIRED_GOOGLE_SHEETS_API_VERSION = "sksk-customer-portal-v10";

// Default seed shop customers to guarantee instant loading even before network response
export const DEFAULT_SHOP_CUSTOMERS = [
  {
    mobile: '7507808795',
    name: 'Satish Trambak Dawange',
    address: 'Kanmandale, Tal- Chandawad',
    totalBills: 5,
    totalPurchased: 9700,
    totalPaid: 9700,
    balanceUdhaari: 0,
    lastVisit: '2026-11-01',
    bills: []
  },
  {
    mobile: '9075798442',
    name: 'Neha Dawange',
    address: 'Kanmandale village',
    totalBills: 5,
    totalPurchased: 8575,
    totalPaid: 8575,
    balanceUdhaari: 0,
    lastVisit: '2026-11-01',
    bills: []
  },
  {
    mobile: '9370621253',
    name: 'satish dawange',
    address: 'Kanmandale',
    totalBills: 5,
    totalPurchased: 13800,
    totalPaid: 13800,
    balanceUdhaari: 0,
    lastVisit: '2026-10-31',
    bills: []
  }
];

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
export function readStorage(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Error reading localStorage for key ${key}:`, e);
    return defaultValue;
  }
}

export function writeStorage(key, value) {
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
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    writeStorage(STORAGE_KEYS.USERS, [
      { id: 'admin', username: 'admin', password: 'admin123', role: 'admin', fullName: 'निलेश दवंगे (Admin)', mobile: '8459568940', createdAt: new Date().toISOString() },
      { id: 'staff', username: 'staff', password: 'staff123', role: 'staff', fullName: 'काउंटर ऑपरेटर', mobile: '9876543210', createdAt: new Date().toISOString() }
    ]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.BILLS)) {
    writeStorage(STORAGE_KEYS.BILLS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CHALLANS)) {
    writeStorage(STORAGE_KEYS.CHALLANS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PURCHASES)) {
    writeStorage(STORAGE_KEYS.PURCHASES, []);
  }
  
  // Seed initial shop customers if missing
  const existingCustMap = readStorage(STORAGE_KEYS.CUSTOMERS, {}) || {};
  let updatedCust = false;
  DEFAULT_SHOP_CUSTOMERS.forEach((c) => {
    if (!existingCustMap[c.mobile]) {
      existingCustMap[c.mobile] = c;
      updatedCust = true;
    }
  });
  if (updatedCust || !localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    writeStorage(STORAGE_KEYS.CUSTOMERS, existingCustMap);
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
  window.dispatchEvent(
    new CustomEvent("sksk-sheets-config-change", { detail: updated }),
  );
  return updated;
}

const sheetRecordsCache = new Map();
const inFlightSheetRequests = new Map();

export async function fetchGoogleSheetRecords(sheetName, forceRefresh = false) {
  const normSheet = String(sheetName || '').trim();
  if (!normSheet) return [];

  if (!forceRefresh && sheetRecordsCache.has(normSheet)) {
    const cached = sheetRecordsCache.get(normSheet);
    if (Date.now() - cached.timestamp < 15000) {
      return cached.data;
    }
  }

  if (inFlightSheetRequests.has(normSheet)) {
    return inFlightSheetRequests.get(normSheet);
  }

  const requestPromise = (async () => {
    const configUrl = getGoogleSheetsConfig().webAppUrl.trim();
    const urlsToTry = [];
    if (configUrl) urlsToTry.push(configUrl);
    if (!urlsToTry.includes(DEFAULT_GOOGLE_SHEETS_API_URL)) {
      urlsToTry.push(DEFAULT_GOOGLE_SHEETS_API_URL);
    }

    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    for (const targetUrl of urlsToTry) {
      const attempts = token ? [{ withToken: true }, { withToken: false }] : [{ withToken: false }];
      for (const attempt of attempts) {
        try {
          const query = new URLSearchParams({ action: "getAll", sheetName: normSheet });
          if (attempt.withToken && token) query.set("token", token);

          const response = await fetch(
            `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}${query}`,
            {
              method: "GET",
              mode: "cors",
              cache: "no-store",
            },
          );
          if (!response.ok) continue;

          const result = await response.json();
          if (result && result.success && Array.isArray(result.data)) {
            sheetRecordsCache.set(normSheet, { data: result.data, timestamp: Date.now() });
            return result.data;
          }
        } catch (e) {
          // Fall through to next attempt or default URL
        }
      }
    }
    return [];
  })().finally(() => {
    inFlightSheetRequests.delete(normSheet);
  });

  inFlightSheetRequests.set(normSheet, requestPromise);
  return requestPromise;
}

async function sendGoogleSheetsAuthAction(action, data) {
  const url = getGoogleSheetsConfig().webAppUrl.trim();
  if (!url)
    throw new Error("Google Apps Script Web App URL is not configured.");

  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...data }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Google Sheets authentication failed (${response.status}).`,
    );
  }
  return response.json();
}

export async function loginWithGoogleSheets(username, password) {
  const result = await sendGoogleSheetsAuthAction("login", {
    username,
    password,
  });
  if (result.success && result.user && !result.token) {
    throw new Error(
      "Google Apps Script जुनी आवृत्ती आहे. Admin/Staff login सुरू करण्यासाठी नवीन session-enabled script deploy करा.",
    );
  }
  if (!result.success || !result.user || !result.token) {
    throw new Error(
      result.error || "चुकीचा आयडी किंवा पासवर्ड! कृपया पुन्हा तपासा.",
    );
  }
  return { user: result.user, token: result.token };
}

export async function validateGoogleSheetsSession(token) {
  if (!token) return { valid: false, reason: "missing_token" };
  const result = await sendGoogleSheetsAuthAction("validateSession", { token });
  if (!result.success) {
    if (/invalid action/i.test(result.error || "")) {
      throw new Error(
        "Google Apps Script जुनी आवृत्ती आहे. नवीन session-enabled script deploy करा.",
      );
    }
    throw new Error(result.error || "सत्राची पडताळणी करता आली नाही.");
  }
  return {
    valid: Boolean(result.valid),
    user: result.user,
    reason: result.reason,
  };
}

export async function logoutGoogleSheetsSession(token) {
  if (!token) return;
  const result = await sendGoogleSheetsAuthAction("logout", { token });
  if (!result.success) {
    throw new Error(result.error || "सत्र बंद करता आले नाही.");
  }
}

export async function changeGoogleSheetsPassword(
  token,
  currentPassword,
  newPassword,
) {
  await requireGoogleSheetsApiVersion();
  const result = await sendGoogleSheetsAuthAction("changePassword", {
    token,
    currentPassword,
    newPassword,
  });
  if (!result.success) {
    if (/invalid action/i.test(result.error || "")) {
      throw new Error(
        "Google Apps Script जुनी आवृत्ती आहे. Password change साठी updated script deploy करा.",
      );
    }
    throw new Error(result.error || "पासवर्ड बदलता आला नाही.");
  }
  return result;
}

export async function fetchMyCustomerBills(explicitMobile = '') {
  let bills = [];
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('sksk_auth_user') || '{}');
  } catch {}

  const targetMobile = String(
    explicitMobile ||
    user?.mobile ||
    user?.username ||
    String(user?.id || '').replace(/^CUST-/i, '')
  ).replace(/\D/g, '').slice(-10);

  // 1. If session token is present, try Google Sheets Auth Action
  if (token) {
    try {
      const result = await sendGoogleSheetsAuthAction("getMyBills", { token });
      if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
        bills = result.data.map(b => ({
          ...b,
          Customer_Mobile: b.Customer_Mobile || b.Mobile || targetMobile,
          customerMobile: b.customerMobile || targetMobile
        }));
      }
    } catch (err) {
      console.warn("sendGoogleSheetsAuthAction getMyBills failed, trying fallbacks:", err.message);
    }
  }

  // 2. Fallbacks if bills is empty and targetMobile is known
  if (bills.length === 0 && targetMobile) {
    // 2a. Check sksk_bills_db in localStorage
    try {
      const localBills = readStorage(STORAGE_KEYS.BILLS, []);
      if (Array.isArray(localBills) && localBills.length > 0) {
        const matched = localBills.filter((b) => {
          const m = String(b.customerMobile || b.Customer_Mobile || b.Mobile || b.mobile || '')
            .replace(/\D/g, '').slice(-10);
          return m === targetMobile;
        });
        if (matched.length > 0) {
          bills = matched;
        }
      }
    } catch (err) {
      console.warn("Local sksk_bills_db fallback error:", err.message);
    }

    // 2b. Check if we can fetch Google Sheets 'Bills' tab directly
    if (bills.length === 0) {
      try {
        const sheetBills = await fetchGoogleSheetRecords("Bills");
        if (Array.isArray(sheetBills) && sheetBills.length > 0) {
          const matched = sheetBills.filter((row) => {
            const m = String(row.Customer_Mobile || row.Mobile || row.customerMobile || row.mobile || '')
              .replace(/\D/g, '').slice(-10);
            return m === targetMobile;
          });
          if (matched.length > 0) {
            bills = matched;
          }
        }
      } catch (err) {
        console.warn("fetchGoogleSheetRecords Bills fallback error:", err.message);
      }
    }

    // 2c. Check sksk_bills_backup in localStorage
    if (bills.length === 0) {
      try {
        const rawBackup = localStorage.getItem("sksk_bills_backup");
        if (rawBackup) {
          const backupObj = JSON.parse(rawBackup);
          if (backupObj[targetMobile] && Array.isArray(backupObj[targetMobile].bills)) {
            bills = backupObj[targetMobile].bills;
          }
        }
      } catch (err) {
        console.warn("sksk_bills_backup fallback error:", err.message);
      }
    }
  }

  return Array.isArray(bills) ? bills : [];
}

export async function sendGoogleSheetsAction(action, data) {
  const url = getGoogleSheetsConfig().webAppUrl.trim();
  if (!url)
    throw new Error("Google Apps Script Web App URL is not configured.");

  await fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, data }),
  });
  return { success: true, sent: true };
}

async function requireGoogleSheetsApiVersion() {
  const url = getGoogleSheetsConfig().webAppUrl.trim();
  if (!url)
    throw new Error("Google Apps Script Web App URL is not configured.");
  const pingUrl = `${url}${url.includes("?") ? "&" : "?"}action=ping`;
  const response = await fetch(pingUrl, {
    method: "GET",
    mode: "cors",
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Google Sheets version check failed (${response.status}).`);
  const result = await response.json();
  if (result.apiVersion !== REQUIRED_GOOGLE_SHEETS_API_VERSION) {
    throw new Error(
      "Google Apps Script जुनी आवृत्ती आहे. नवीन v10 script पुन्हा deploy करा.",
    );
  }
}

async function sendGoogleSheetsActionForResult(action, data) {
  const url = getGoogleSheetsConfig().webAppUrl.trim();
  if (!url)
    throw new Error("Google Apps Script Web App URL is not configured.");
  await requireGoogleSheetsApiVersion();

  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, data }),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Google Sheets request failed (${response.status}).`);
  const result = await response.json();
  if (!result.success)
    throw new Error(
      result.error || `Google Sheets could not complete ${action}.`,
    );
  return result;
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
        let allItems = filterSheetRows(
          await fetchGoogleSheetRecords(sheetName),
          { search, category },
        );
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
      if (
        sheetName === "Bills" ||
        sheetName === "Customers" ||
        sheetName === "Inventory" ||
        sheetName === "Products" ||
        sheetName === "Consultancy_Customers"
      ) {
        const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        if (token) qParams.set("token", token);
      }

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
    const vals = Object.values(custMap || {});
    items = vals.length > 0 ? vals : DEFAULT_SHOP_CUSTOMERS;
  } else if (sheetName === "Consultancy_Customers") {
    items = readStorage(STORAGE_KEYS.CONSULTANCY_CUSTOMERS, []);
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

export async function getLiveInventoryItems({ strict = false } = {}) {
  try {
    const rows = await fetchGoogleSheetRecords("Inventory");
    const items = rows.map(normalizeInventoryRow);
    writeStorage(STORAGE_KEYS.INVENTORY, items);
    return items;
  } catch (error) {
    if (strict) throw error;
    console.warn(
      "Could not load live inventory; using cached inventory.",
      error,
    );
    return getAllInventoryItems().map(normalizeInventoryRow);
  }
}

export function saveInventoryItemLocal(item) {
  const list = getAllInventoryItems();
  const id = item.id || item.ID || item.Product_ID || `inv-${Date.now()}`;
  const index = list.findIndex(
    (i) =>
      i.id === id ||
      i.ID === id ||
      (i.name?.trim().toLowerCase() ===
        String(item.name || "")
          .trim()
          .toLowerCase() &&
        String(item.name || "").trim()),
  );

  const fullItem = {
    ...item,
    id,
    ID: id,
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

  return fullItem;
}

export async function saveInventoryItem(item) {
  const id = item.id || item.ID || item.Product_ID || `inv-${Date.now()}`;
  const payload = { ...item, id, ID: id, updatedAt: new Date().toISOString() };
  const config = getGoogleSheetsConfig();
  let isLive = false;
  if (config.webAppUrl.trim()) {
    await sendGoogleSheetsActionForResult("saveInventoryItem", payload);
    isLive = true;
  }
  const saved = saveInventoryItemLocal(payload);
  return { item: saved, isLive };
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

//read geminiAPI key
export async function getGeminiApiKey() {
  try {
    const settings = await fetchGoogleSheetRecords("Settings");

    const setting = settings.find(
      (row) =>
        String(row.name || row.Name || row.key || row.Key || "")
          .trim()
          .toLowerCase() === "gemini_api_key",
    );

    if (!setting) {
      throw new Error("gemini_api_key not found in Settings sheet.");
    }

    const apiKey = String(setting.value || setting.Value || "").trim();

    if (!apiKey) {
      throw new Error("Gemini API key value is empty.");
    }

    return apiKey;
  } catch (error) {
    console.error("Error fetching Gemini API key:", error);
    throw error;
  }
}

// Record Bulk Purchase Lot & Update Stock
export async function recordBulkPurchaseLot(lotData) {
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
    productNameEn: lotData.productNameEn || "",
    bulkQty: qty,
    unit: lotData.unit || "नग",
    totalCost,
    unitCost,
    sellingPrice: Number(lotData.sellingPrice || unitCost * 1.15),
    notes: lotData.notes || "",
    createdAt: new Date().toISOString(),
  };

  const inventory = getAllInventoryItems();
  const requestedItem = lotData.inventoryItem || {};
  const selectedId = String(
    lotData.inventoryId || requestedItem.id || requestedItem.ID || "",
  );
  const productName = lotRecord.productName.trim().toLowerCase();
  const productNameEn = lotRecord.productNameEn.trim().toLowerCase();
  const existing = inventory.find(
    (item) =>
      (selectedId && String(item.id || item.ID) === selectedId) ||
      [item.name, item.nameEn].some((name) => {
        const candidate = String(name || "")
          .trim()
          .toLowerCase();
        return (
          candidate &&
          (candidate === productName ||
            (productNameEn && candidate === productNameEn))
        );
      }),
  );
  const itemId =
    selectedId || existing?.id || existing?.ID || `INV-${Date.now()}`;
  const nextStock =
    Number(
      existing?.availableStock ??
        existing?.Available_Stock ??
        requestedItem.availableStock ??
        requestedItem.Available_Stock ??
        0,
    ) + qty;
  const inventoryItem = {
    ...existing,
    ...requestedItem,
    id: itemId,
    ID: itemId,
    name: lotRecord.productName,
    Name: lotRecord.productName,
    nameEn: lotRecord.productNameEn,
    Name_EN: lotRecord.productNameEn,
    category: lotRecord.category,
    Category: lotRecord.category,
    categoryEn:
      lotData.categoryEn ||
      requestedItem.categoryEn ||
      requestedItem.Category_EN ||
      "",
    Category_EN:
      lotData.categoryEn ||
      requestedItem.categoryEn ||
      requestedItem.Category_EN ||
      "",
    subcategory: lotRecord.subcategory,
    Subcategory: lotRecord.subcategory,
    unit: lotRecord.unit,
    Unit: lotRecord.unit,
    purchasePrice: unitCost,
    Purchase_Price: unitCost,
    sellingPrice: lotRecord.sellingPrice,
    Selling_Price: lotRecord.sellingPrice,
    availableStock: nextStock,
    Available_Stock: nextStock,
    minAlertQty: Number(
      lotData.minAlertQty ??
        requestedItem.minAlertQty ??
        requestedItem.Min_Alert_Qty ??
        10,
    ),
    Min_Alert_Qty: Number(
      lotData.minAlertQty ??
        requestedItem.minAlertQty ??
        requestedItem.Min_Alert_Qty ??
        10,
    ),
    updatedAt: new Date().toISOString(),
    Updated_At: new Date().toISOString(),
  };

  const config = getGoogleSheetsConfig();
  let isLive = false;
  if (config.webAppUrl.trim()) {
    await sendGoogleSheetsActionForResult("savePurchaseLot", {
      ...lotRecord,
      inventoryId: itemId,
      inventoryItem,
    });
    isLive = true;
  }

  lots.unshift(lotRecord);
  writeStorage(STORAGE_KEYS.PURCHASES, lots);
  const index = inventory.findIndex(
    (item) => String(item.id || item.ID) === itemId,
  );
  if (index >= 0) inventory[index] = { ...inventory[index], ...inventoryItem };
  else inventory.unshift(inventoryItem);
  writeStorage(STORAGE_KEYS.INVENTORY, inventory);

  return { ...lotRecord, inventoryItem, isLive };
}

// -----------------------------------------------------------------------------
// Billing System with Live Inventory Deduction & Khata Updates
// -----------------------------------------------------------------------------
export async function saveBillWithInventoryDeduction(billData) {
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
    isConsultancy: Boolean(billData.isConsultancy || billData.Is_Consultancy_Customer),
    Is_Consultancy_Customer: Boolean(billData.isConsultancy || billData.Is_Consultancy_Customer),
    consultancyCrop: String(billData.consultancyCrop || billData.Consultancy_Crop || ""),
    Consultancy_Crop: String(billData.consultancyCrop || billData.Consultancy_Crop || ""),
    createdAt: billData.createdAt || new Date().toISOString(),
    billDate: billData.billDate || new Date().toISOString().split("T")[0],
  };

  // If this bill is for a consultancy customer, ensure customer is registered in Consultancy_Customers
  if (billData.isConsultancy && billData.customerMobile) {
    try {
      saveConsultancyCustomer({
        name: billData.customerName,
        mobile: billData.customerMobile,
        crop: billData.consultancyCrop || 'इतर',
        address: billData.customerAddress || ''
      }).catch(e => console.warn('Auto-save consultancy customer non-blocking error:', e));
    } catch {}
  }

  const config = getGoogleSheetsConfig();
  let isLive = false;
  if (config.webAppUrl.trim()) {
    await sendGoogleSheetsActionForResult("saveBill", newBill);
    isLive = true;
  }

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

    // 3. User Account Update for Customer in users tab / database
    // If mobile number is not added as id in users, add entry where id, username, password = mobile, role = customer
    if (mobile.length === 10) {
      const users = readStorage(STORAGE_KEYS.USERS, []);
      const exists = users.some(
        (u) =>
          String(u.id || "").replace(/\D/g, "").slice(-10) === mobile ||
          String(u.username || "").trim().toLowerCase() === mobile ||
          String(u.mobile || "").replace(/\D/g, "").slice(-10) === mobile
      );
      if (!exists) {
        const newUser = {
          id: mobile,
          username: mobile,
          password: mobile,
          role: "customer",
          fullName: billData.customerName || "ग्राहक",
          mobile: mobile,
          createdAt: new Date().toISOString(),
        };
        users.push(newUser);
        writeStorage(STORAGE_KEYS.USERS, users);
      }

      // Also ensure customer user in Google Sheets Users tab
      syncItemToSheets("ensureUser", {
        mobile,
        fullName: billData.customerName || "ग्राहक",
      });
    }
  }

  return { ...newBill, isLive };
}

// Ensure customer user exists in Users table (id, username, password = mobile, role = customer)
export function ensureCustomerUserLocal(mobileRaw, customerName = "") {
  const mobile = String(mobileRaw || "").replace(/\D/g, "").slice(-10);
  if (!mobile || mobile.length < 10) return null;
  const users = readStorage(STORAGE_KEYS.USERS, []);
  const exists = users.find(
    (u) =>
      String(u.id || "").replace(/\D/g, "").slice(-10) === mobile ||
      String(u.username || "").trim().toLowerCase() === mobile ||
      String(u.mobile || "").replace(/\D/g, "").slice(-10) === mobile
  );
  if (!exists) {
    const newUser = {
      id: mobile,
      username: mobile,
      password: mobile,
      role: "customer",
      fullName: customerName || "ग्राहक",
      mobile: mobile,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    writeStorage(STORAGE_KEYS.USERS, users);
    syncItemToSheets("ensureUser", {
      mobile,
      fullName: customerName || "ग्राहक",
    });
    return newUser;
  }
  return exists;
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
export async function getDashboardMetrics(filters = {}) {
  const config = getGoogleSheetsConfig();
  if (config.webAppUrl.trim()) {
    const query = new URLSearchParams({
      action: "getDashboardMetrics",
      startDate: filters.startDate || "",
      endDate: filters.endDate || "",
      category: filters.category || "all",
      search: filters.search || "",
      status: filters.status || "all",
      page: String(filters.page || 1),
      limit: String(filters.limit || 5),
      token: localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "",
    });
    const response = await fetch(
      `${config.webAppUrl}${config.webAppUrl.includes("?") ? "&" : "?"}${query}`,
      {
        method: "GET",
        mode: "cors",
        cache: "no-store",
      },
    );
    if (!response.ok)
      throw new Error(
        `Google Sheets dashboard request failed (${response.status}).`,
      );
    const result = await response.json();
    if (!result.success) {
      if (/Invalid action: getDashboardMetrics/i.test(result.error || "")) {
        throw new Error(
          "Dashboard साठी नवीन Google Apps Script (v10) deploy करा.",
        );
      }
      throw new Error(result.error || "Could not load dashboard metrics.");
    }
    return result.data;
  }
  return getLocalDashboardMetrics(filters);
}

async function getLocalDashboardMetrics(filters) {
  const readNumber = (row, ...keys) => {
    for (const key of keys)
      if (row?.[key] !== undefined && row[key] !== "")
        return Number(row[key]) || 0;
    return 0;
  };
  const readValue = (row, ...keys) => {
    for (const key of keys)
      if (row?.[key] !== undefined && row[key] !== "") return row[key];
    return "";
  };
  const useGoogleSheets = Boolean(getGoogleSheetsConfig().webAppUrl.trim());
  const [sheetBills, sheetInventory, sheetChallans, sheetCustomers] =
    useGoogleSheets
      ? await Promise.all([
          fetchGoogleSheetRecords("Bills"),
          fetchGoogleSheetRecords("Inventory"),
          fetchGoogleSheetRecords("Challans"),
          fetchGoogleSheetRecords("Customers"),
        ])
      : [[], [], [], []];
  const billsSource = useGoogleSheets
    ? sheetBills
    : readStorage(STORAGE_KEYS.BILLS, []);
  const inventorySource = useGoogleSheets
    ? sheetInventory
    : getAllInventoryItems();
  const challansSource = useGoogleSheets
    ? sheetChallans
    : readStorage(STORAGE_KEYS.CHALLANS, []);
  const customerSource = useGoogleSheets
    ? sheetCustomers
    : Object.values(readStorage(STORAGE_KEYS.CUSTOMERS, {}));
  const bills = billsSource.map((b) => {
    let items = b.items || b.Items_JSON || b.items_json || [];
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }
    return {
      ...b,
      billNo: readValue(b, "Bill_No", "billNo", "bill_no", "id"),
      billDate: readValue(
        b,
        "Date",
        "billDate",
        "date",
        "Created_At",
        "createdAt",
      ),
      totalAmount: readNumber(b, "Total_Amount", "totalAmount", "total_amount"),
      paidAmount: readNumber(b, "Paid_Amount", "paidAmount", "paid_amount"),
      balanceAmount: readNumber(
        b,
        "Balance_Amount",
        "balanceAmount",
        "balance_amount",
      ),
      customerName: readValue(
        b,
        "Customer_Name",
        "customerName",
        "customer_name",
      ),
      items: Array.isArray(items) ? items : [],
    };
  });
  const inventory = inventorySource.map((item) => ({
    ...item,
    name: readValue(item, "Name", "name", "Name_MR"),
    category: readValue(
      item,
      "Category",
      "category",
      "Category_MR",
      "Category_EN",
    ),
    purchasePrice: readNumber(
      item,
      "Purchase_Price",
      "purchasePrice",
      "purchase_price",
    ),
    availableStock: readNumber(
      item,
      "Available_Stock",
      "availableStock",
      "available_stock",
      "Stock",
      "Quantity",
    ),
    minAlertQty:
      readNumber(item, "Min_Alert_Qty", "minAlertQty", "min_alert_qty") || 10,
  }));
  const challans = challansSource;
  const customers = customerSource.map((c) => ({
    ...c,
    customerName: readValue(
      c,
      "Customer_Name",
      "customerName",
      "customer_name",
    ),
    mobile: readValue(c, "Mobile", "mobile", "mobile_number"),
    customerAddress: readValue(
      c,
      "Address",
      "customerAddress",
      "customer_address",
    ),
    totalPurchased: readNumber(
      c,
      "Total_Purchased",
      "totalPurchased",
      "total_purchased",
    ),
    balanceUdhaari: readNumber(
      c,
      "Balance_Udhaari",
      "balanceUdhaari",
      "balance_udhari",
    ),
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

  const startDate = filters.startDate || new Date().toISOString().slice(0, 10);
  const endDate = filters.endDate || startDate;
  const selectedBills = bills.filter(
    (bill) => bill.billDate >= startDate && bill.billDate <= endDate,
  );
  const analytics = buildDashboardAnalytics({
    metrics: { bills: selectedBills, inventory },
    period: "custom",
    fromMonth: startDate.slice(0, 7),
    toMonth: endDate.slice(0, 7),
    categoryFilter: filters.category || "all",
  });
  const search = String(filters.search || "")
    .trim()
    .toLowerCase();
  const status = filters.status || "all";
  const matchingBills = analytics.filteredBills.filter((bill) => {
    const matchesSearch =
      !search ||
      `${bill.billNo} ${bill.customerName}`.toLowerCase().includes(search);
    const hasDue = Number(bill._filteredDue) > 0;
    return (
      matchesSearch &&
      (status === "all" || (status === "due" ? hasDue : !hasDue))
    );
  });
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 5));
  const totalPages = Math.max(1, Math.ceil(matchingBills.length / limit));
  const page = Math.min(Math.max(1, Number(filters.page) || 1), totalPages);
  return {
    totalSales,
    totalPaid,
    totalUdhaari,
    todaySales,
    totalBills: analytics.filteredBills.length,
    totalChallans: challans.length,
    totalInventoryProducts: inventory.length,
    totalStockValuation,
    lowStockCount,
    lowStockItems,
    pendingKhata,
    totalCustomers: customers.length,
    bills: matchingBills.slice((page - 1) * limit, page * limit),
    selectedTotals: analytics.selectedTotals,
    chartData: analytics.chartData,
    categoryData: analytics.categoryData,
    billPagination: { page, limit, total: matchingBills.length, totalPages },
    inventory,
    categories: [
      ...new Set(inventory.map((item) => item.category).filter(Boolean)),
    ].sort(),
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
      {
        key: "shop_name",
        value: ShopProp.name,
        description: "Shop display name",
      },
      {
        key: "full_name",
        value: ShopProp.fullName,
        description: "Shop Marathi name",
      },
      {
        key: "owner_name",
        value: ShopProp.ownerName,
        description: "Proprietor",
      },
      { key: "phone", value: ShopProp.phone, description: "Contact number" },
      {
        key: "whatsapp",
        value: ShopProp.whatsapp,
        description: "WhatsApp number",
      },
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
    message:
      "Sync request sent to Google Sheets. Check the sheet to confirm the data was saved.",
  };
}

// ─── Fetch ALL settings rows from the Google Sheet Settings tab ───────────────
export async function fetchAllSheetSettings() {
  try {
    const rows = await fetchGoogleSheetRecords('Settings');
    // Normalize: each row has key/name and value fields
    return rows.map(row => ({
      key: String(row.key || row.Key || row.name || row.Name || '').trim(),
      value: String(row.value || row.Value || '').trim(),
      description: String(row.description || row.Description || row.desc || '').trim(),
      category: String(row.category || row.Category || 'General').trim(),
    })).filter(r => r.key);
  } catch (err) {
    console.error('fetchAllSheetSettings error:', err);
    throw err;
  }
}

// ─── Save / Update a single setting key-value pair to Google Sheet ─────────────
export async function saveSheetSetting(key, value) {
  const config = getGoogleSheetsConfig();
  if (!config.webAppUrl) throw new Error('Google Sheets not connected.');
  // POST with no-cors (Apps Script limitation)
  await fetch(config.webAppUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'updateSetting',
      data: { key, value }
    })
  });
  return { success: true };
}

// ─── Fetch Categories from Google Sheets Categories tab ───────────────────────
export async function fetchAllSheetCategories() {
  try {
    const rows = await fetchGoogleSheetRecords('Categories');
    if (!rows || rows.length === 0) {
      return googleSheetsCategorySeed;
    }
    return rows.map((row, idx) => ({
      id: String(row.Category_ID || row.id || row.ID || ('cat_' + (idx + 1))).trim(),
      name: String(row.Name_MR || row.name || row.Name || '').trim(),
      nameEn: String(row.Name_EN || row.nameEn || row.name_en || '').trim(),
      isActive: row.Is_Active !== undefined
        ? (String(row.Is_Active).toLowerCase() === 'true' || row.Is_Active === true)
        : true,
      sortOrder: Number(row.Sort_Order ?? row.sortOrder ?? idx + 1),
      createdAt: row.Created_At || row.createdAt || '',
      updatedAt: row.Updated_At || row.updatedAt || '',
    })).filter(c => c.name || c.id);
  } catch (err) {
    console.warn('fetchAllSheetCategories fallback to seed:', err);
    return googleSheetsCategorySeed;
  }
}

// ─── Save / Update a Category in Google Sheet ────────────────────────────────
export async function saveSheetCategory(categoryData) {
  const config = getGoogleSheetsConfig();
  if (!config.webAppUrl) throw new Error('Google Sheets not connected.');

  const payload = {
    action: 'saveCategory',
    data: {
      Category_ID: categoryData.id || ('cat_' + Date.now()),
      Name_MR: categoryData.name || '',
      Name_EN: categoryData.nameEn || '',
      Is_Active: categoryData.isActive !== false,
      Sort_Order: Number(categoryData.sortOrder || 0),
    }
  };

  await fetch(config.webAppUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  return { success: true };
}

// ─── Fetch Services from Google Sheets or Seed ────────────────────────────────
export async function fetchAllServices() {
  try {
    const rows = await fetchGoogleSheetRecords('Services');
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r, idx) => ({
        id: String(r.Service_ID || r.id || ('serv_' + (idx + 1))).trim(),
        nameMr: String(r.Name_MR || r.nameMr || r.name || '').trim(),
        nameEn: String(r.Name_EN || r.nameEn || '').trim(),
        crop: String(r.Crop || r.crop || r.Name_MR || '').trim(),
        cardImageUrl: String(r.Card_Image_URL || r.cardImageUrl || r.image || '').trim(),
        slideshowImages: String(r.Slideshow_Images || r.slideshowImages || '').trim(),
        descriptionMr: String(r.Description_MR || r.descriptionMr || r.description || '').trim(),
        descriptionEn: String(r.Description_EN || r.descriptionEn || '').trim(),
        keyBenefitsMr: String(r.Key_Benefits_MR || r.keyBenefitsMr || '').trim(),
        farmerFeedback: String(r.Farmer_Feedback || r.farmerFeedback || '').trim(),
        isActive: r.Is_Active !== undefined ? (String(r.Is_Active).toLowerCase() === 'true' || r.Is_Active === true) : true,
        showOnPortal: r.Show_On_Portal !== undefined ? (String(r.Show_On_Portal).toLowerCase() === 'true' || r.Show_On_Portal === true) : true,
        sortOrder: Number(r.Sort_Order ?? r.sortOrder ?? idx + 1),
        createdAt: r.Created_At || r.createdAt || '',
        updatedAt: r.Updated_At || r.updatedAt || ''
      })).filter(s => s.nameMr || s.nameEn);
    }
  } catch (err) {
    console.warn('fetchAllServices sheet fetch error, using local/seed fallback:', err.message);
  }

  // Check localStorage or initialConsultancyServices
  const local = readStorage(STORAGE_KEYS.SERVICES, null);
  if (Array.isArray(local) && local.length > 0) {
    return local;
  }
  return initialConsultancyServices;
}

// ─── Save / Update a Service in Google Sheet ─────────────────────────────────
export async function saveServiceItem(serviceData) {
  const config = getGoogleSheetsConfig();
  const sId = serviceData.id || ('serv_' + Date.now());

  const payload = {
    action: 'saveService',
    data: {
      Service_ID: sId,
      Name_MR: serviceData.nameMr || '',
      Name_EN: serviceData.nameEn || '',
      Card_Image_URL: serviceData.cardImageUrl || '',
      Slideshow_Images: serviceData.slideshowImages || '',
      Description_MR: serviceData.descriptionMr || '',
      Description_EN: serviceData.descriptionEn || '',
      Key_Benefits_MR: serviceData.keyBenefitsMr || '',
      Farmer_Feedback: serviceData.farmerFeedback || '',
      Is_Active: serviceData.isActive !== false,
      Show_On_Portal: serviceData.showOnPortal !== false,
      Sort_Order: Number(serviceData.sortOrder || 1)
    }
  };

  // Update local storage cache
  const local = readStorage(STORAGE_KEYS.SERVICES, initialConsultancyServices);
  const updatedLocal = local.some(s => s.id === sId)
    ? local.map(s => s.id === sId ? { ...s, ...serviceData, id: sId } : s)
    : [...local, { ...serviceData, id: sId }];
  writeStorage(STORAGE_KEYS.SERVICES, updatedLocal);

  if (config.webAppUrl) {
    await fetch(config.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  }

  return { success: true, id: sId };
}

// ─── Fetch All Consultancy Customers ──────────────────────────────────────────
export async function fetchAllConsultancyCustomers(forceRefresh = false) {
  const customerMap = new Map();

  // 1. Try fetching from Google Sheet Consultancy_Customers tab
  try {
    const rows = await fetchGoogleSheetRecords('Consultancy_Customers', forceRefresh);
    if (Array.isArray(rows) && rows.length > 0) {
      rows.forEach((r, idx) => {
        const mob = String(r.Mobile || r.mobile || '').replace(/\D/g, '').slice(-10);
        const name = String(r.Customer_Name || r.name || r.Name || '').trim();
        if (mob || name) {
          const key = mob || name;
          customerMap.set(key, {
            id: String(r.ID || r.id || ('CC_' + (mob || (idx + 1)))).trim(),
            name: name || 'शेतकरी',
            mobile: mob,
            crop: String(r.Crop || r.crop || 'इतर').trim(),
            address: String(r.Address || r.address || '').trim(),
            status: String(r.Status || r.status || 'Active').trim(),
            areaAcres: String(r.Area_Acres || r.areaAcres || '1').trim(),
            startDate: r.Start_Date || r.startDate || '',
            notes: String(r.Notes || r.notes || '').trim(),
            createdAt: r.Created_At || r.createdAt || '',
            updatedAt: r.Updated_At || r.updatedAt || ''
          });
        }
      });
    }
  } catch (err) {
    console.warn('fetchAllConsultancyCustomers sheet fetch fallback:', err.message);
  }

  // 2. Also scan any bills marked with consultancy
  try {
    const allBills = await fetchAllBills();
    allBills.forEach((b) => {
      const isCons = b.isConsultancy || b.Is_Consultancy_Customer;
      const crop = b.consultancyCrop || b.Consultancy_Crop;
      if (isCons || crop) {
        const mob = String(b.customerMobile || b.mobile || '').replace(/\D/g, '').slice(-10);
        const name = String(b.customerName || b.name || '').trim();
        const key = mob || name;
        if (key && !customerMap.has(key)) {
          customerMap.set(key, {
            id: 'CC_' + (mob || Date.now()),
            name: name || 'कन्सल्टन्सी शेतकरी',
            mobile: mob,
            crop: crop || 'द्राक्ष (Grapes)',
            address: b.customerAddress || b.address || '',
            status: 'Active',
            areaAcres: '1',
            startDate: b.billDate || '',
            notes: 'बिलावरून नोंदणीकृत',
            createdAt: b.createdAt || '',
            updatedAt: ''
          });
        }
      }
    });
  } catch {}

  // 3. Merge with local storage
  const local = readStorage(STORAGE_KEYS.CONSULTANCY_CUSTOMERS, []);
  if (Array.isArray(local)) {
    local.forEach((c) => {
      const key = String(c.mobile || c.name || '').replace(/\D/g, '').slice(-10) || c.name;
      if (key && !customerMap.has(key)) {
        customerMap.set(key, c);
      }
    });
  }

  // 4. Seed default demonstration consultancy customers if still empty
  if (customerMap.size === 0) {
    const defaultConsultancy = [
      { id: 'CC_8459568940', name: 'रमेश सखाराम पाटील', mobile: '8459568940', crop: 'द्राक्ष (Grapes)', address: 'मु. पो. कानमंडाळे, चांदवड', status: 'Active', areaAcres: '3.5', startDate: '2026-01-10', notes: 'गोडी छाटणी नियोजन पूर्ण' },
      { id: 'CC_9822334455', name: 'विठ्ठल किसन शिंदे', mobile: '9822334455', crop: 'टोमॅटो (Tomato)', address: 'मु. पो. वडबारे, चांदवड', status: 'Active', areaAcres: '2', startDate: '2026-02-01', notes: 'अर्ली ब्लाइट प्रतिबंधक स्प्रे' },
      { id: 'CC_9423556677', name: 'समाधान उत्तम बोरसे', mobile: '9423556677', crop: 'डाळिंब (Pomegranate)', address: 'मु. पो. उमराणे, देवळा', status: 'Active', areaAcres: '4', startDate: '2026-01-20', notes: 'तेल्या प्रतिबंधक नियोजन' },
      { id: 'CC_9977881122', name: 'ज्ञानेश्वर बापू ठाकरे', mobile: '9977881122', crop: 'कलिंगड (Watermelon)', address: 'मु. पो. शिरसाणे, चांदवड', status: 'Active', areaAcres: '1.5', startDate: '2026-02-15', notes: 'ठिबक विद्राव्य खत शेड्यूल' }
    ];
    defaultConsultancy.forEach(c => customerMap.set(c.mobile, c));
    writeStorage(STORAGE_KEYS.CONSULTANCY_CUSTOMERS, defaultConsultancy);
  }

  return Array.from(customerMap.values());
}

// ─── Save / Update a Consultancy Customer ─────────────────────────────────────
export async function saveConsultancyCustomer(customerData) {
  const config = getGoogleSheetsConfig();
  const mobile = String(customerData.mobile || '').replace(/\D/g, '').slice(-10);
  const cId = customerData.id || ('CC_' + (mobile || Date.now()));

  const payload = {
    action: 'saveConsultancyCustomer',
    data: {
      ID: cId,
      Customer_Name: customerData.name || customerData.customerName || '',
      Mobile: mobile,
      Crop: customerData.crop || 'इतर',
      Address: customerData.address || '',
      Status: customerData.status || 'Active',
      Area_Acres: String(customerData.areaAcres || '1'),
      Start_Date: customerData.startDate || new Date().toISOString().split('T')[0],
      Notes: customerData.notes || ''
    }
  };

  // Update local storage
  const local = readStorage(STORAGE_KEYS.CONSULTANCY_CUSTOMERS, []);
  const updatedLocal = local.some(c => c.id === cId || (mobile && c.mobile === mobile))
    ? local.map(c => (c.id === cId || (mobile && c.mobile === mobile)) ? { ...c, ...customerData, id: cId, mobile } : c)
    : [...local, { ...customerData, id: cId, mobile }];
  writeStorage(STORAGE_KEYS.CONSULTANCY_CUSTOMERS, updatedLocal);

  if (config.webAppUrl) {
    await fetch(config.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  }

  return { success: true, id: cId, mobile };
}

// ─── Fetch All Shop Customers (Aggregated from Bills & Customers Sheet) ───────
export async function fetchAllShopCustomers(forceRefresh = false) {
  const customerMap = new Map();

  function getCleanField(row, ...keys) {
    if (!row || typeof row !== 'object') return '';
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return String(row[k]).trim();
      }
    }
    const normKeys = keys.map(k => k.toLowerCase().replace(/[\s_-]+/g, ''));
    for (const actualKey of Object.keys(row)) {
      const normActual = actualKey.toLowerCase().replace(/[\s_-]+/g, '');
      if (normKeys.includes(normActual)) {
        if (row[actualKey] !== undefined && row[actualKey] !== null && String(row[actualKey]).trim() !== '') {
          return String(row[actualKey]).trim();
        }
      }
    }
    return '';
  }

  function findCustomerName(row) {
    if (!row || typeof row !== 'object') return '';
    const explicit = getCleanField(
      row,
      'Customer_Name', 'Customer Name', 'customerName', 'customer_name',
      'Name', 'name', 'Customer', 'customer',
      'Farmer_Name', 'Farmer Name', 'farmerName', 'Farmer', 'farmer',
      'Full_Name', 'Full Name', 'fullName',
      'Party_Name', 'Party Name', 'partyName',
      'Client_Name', 'Client Name',
      'ग्राहक नाव', 'ग्राहकाचे नाव', 'नाव', 'शेतकरी नाव', 'ग्राहक'
    );
    if (explicit && explicit !== 'शेतकरी' && explicit !== 'ग्राहक') return explicit;

    for (const [key, val] of Object.entries(row)) {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (
          trimmed.length >= 3 &&
          trimmed.length <= 60 &&
          !/^[0-9\s\+\-\(\)]+$/.test(trimmed) &&
          !/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(trimmed) &&
          !/^https?:\/\//i.test(trimmed) &&
          !/^(true|false|active|inactive)$/i.test(trimmed)
        ) {
          const normKey = key.toLowerCase().replace(/[\s_-]+/g, '');
          if (!['address', 'village', 'notes', 'id', 'date', 'lastvisit', 'items', 'status', 'mode'].includes(normKey)) {
            return trimmed;
          }
        }
      }
    }
    return explicit || 'शेतकरी';
  }

  function findCustomerMobile(row) {
    if (!row || typeof row !== 'object') return '';
    const explicit = getCleanField(
      row,
      'Mobile', 'mobile', 'Customer_Mobile', 'Customer Mobile', 'customerMobile', 'customer_mobile',
      'Phone', 'phone', 'Phone_No', 'Phone No', 'Phone_Number', 'phone_number',
      'Contact', 'contact', 'Contact_No', 'Contact No',
      'Mobile_No', 'Mobile No', 'Mobile_Number', 'Mobile Number', 'mobilenumber',
      'Mob', 'mob', 'Cell', 'cell',
      'मोबाईल', 'मोबाईल नंबर', 'फोन', 'संपर्क'
    );
    const cleanMob = explicit.replace(/\D/g, '').slice(-10);
    if (cleanMob.length >= 10) return cleanMob;

    for (const [key, val] of Object.entries(row)) {
      if (val !== undefined && val !== null) {
        const digits = String(val).replace(/\D/g, '').slice(-10);
        if (digits.length === 10 && /^[6-9]/.test(digits)) {
          return digits;
        }
      }
    }
    return cleanMob || '';
  }

  // 1. Pre-seed with known default customers so UI is never empty
  DEFAULT_SHOP_CUSTOMERS.forEach((c) => {
    customerMap.set(c.mobile, { ...c });
  });

  // 2. Read local cached customers
  const localCustMap = readStorage(STORAGE_KEYS.CUSTOMERS, {});
  Object.values(localCustMap || {}).forEach((c) => {
    const mob = String(c.mobile || '').replace(/\D/g, '').slice(-10);
    const name = c.name || c.customerName || '';
    const key = mob || (name ? ('NAME_' + name.toLowerCase().trim()) : null);
    if (!key) return;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        mobile: mob,
        name: name || 'ग्राहक',
        address: c.address || c.customerAddress || '',
        totalBills: Number(c.totalBills || 1),
        totalPurchased: Number(c.totalPurchased || 0),
        totalPaid: Number(c.totalPaid || 0),
        balanceUdhaari: Number(c.balance || c.balanceUdhaari || 0),
        lastVisit: c.lastVisit || '',
        bills: []
      });
    }
  });

  // 3. Concurrently fetch both Customers sheet and Bills sheet from remote
  try {
    const [sheetCust, rawBills] = await Promise.all([
      fetchGoogleSheetRecords('Customers', forceRefresh).catch(() => []),
      fetchGoogleSheetRecords('Bills', forceRefresh).catch(() => [])
    ]);

    // Process Google Sheets Customers tab first
    if (Array.isArray(sheetCust) && sheetCust.length > 0) {
      sheetCust.forEach((c) => {
        const rawMobile = findCustomerMobile(c);
        const name = findCustomerName(c);
        const address = getCleanField(c, 'Address', 'address', 'Customer_Address', 'Customer Address', 'Village', 'गाव', 'Place', 'City', 'पत्ता');
        const totalBills = Number(getCleanField(c, 'Total_Bills', 'Total Bills', 'totalBills', 'Bills', 'Count') || 0);
        const totalPurchased = Number(getCleanField(c, 'Total_Purchased', 'Total Purchased', 'totalPurchased', 'Total_Amount', 'Amount') || 0);
        const totalPaid = Number(getCleanField(c, 'Total_Paid', 'Total Paid', 'totalPaid', 'Paid_Amount', 'Paid') || 0);
        const balanceUdhaari = Number(getCleanField(c, 'Balance_Udhaari', 'Balance Udhaari', 'balanceUdhaari', 'Balance', 'Udhaari', 'Udhari', 'Due_Amount') || (totalPurchased - totalPaid) || 0);
        const lastVisit = getCleanField(c, 'Last_Visit', 'Last Visit', 'lastVisit', 'Date', 'date', 'Last_Date');

        const customerKey = rawMobile || (name && name !== 'शेतकरी' ? ('NAME_' + name.toLowerCase().trim()) : null);
        if (!customerKey) return;

        const existing = customerMap.get(customerKey) || (rawMobile ? customerMap.get(rawMobile) : null) || {
          mobile: rawMobile,
          name: name,
          address: address,
          totalBills: totalBills || 1,
          totalPurchased: totalPurchased,
          totalPaid: totalPaid,
          balanceUdhaari: balanceUdhaari,
          lastVisit: lastVisit,
          bills: []
        };

        if (name && (!existing.name || existing.name === 'शेतकरी' || existing.name === 'ग्राहक')) existing.name = name;
        if (address && !existing.address) existing.address = address;
        if (rawMobile && !existing.mobile) existing.mobile = rawMobile;
        if (totalBills) existing.totalBills = Math.max(existing.totalBills, totalBills);
        if (totalPurchased) existing.totalPurchased = Math.max(existing.totalPurchased, totalPurchased);
        if (totalPaid) existing.totalPaid = Math.max(existing.totalPaid, totalPaid);
        if (balanceUdhaari !== undefined) existing.balanceUdhaari = balanceUdhaari;
        if (lastVisit && (!existing.lastVisit || String(lastVisit) > String(existing.lastVisit))) {
          existing.lastVisit = lastVisit;
        }

        customerMap.set(customerKey, existing);
        if (rawMobile && customerKey !== rawMobile) customerMap.set(rawMobile, existing);
      });
    }

    // Process Bills to supplement
    const remoteBills = Array.isArray(rawBills) ? rawBills.map(normalizeBillRow) : [];
    const localBills = (readStorage(STORAGE_KEYS.BILLS, []) || []).map(normalizeBillRow);
    const allBills = [...remoteBills, ...localBills];

    allBills.forEach((bill) => {
      const rawMobile = findCustomerMobile(bill);
      const name = findCustomerName(bill);
      const address = getCleanField(bill, 'customerAddress', 'Customer_Address', 'Customer Address', 'Address', 'address', 'Village', 'गाव', 'City', 'पत्ता');

      const customerKey = rawMobile || (name && name !== 'शेतकरी' && name !== 'ग्राहक' ? ('NAME_' + name.toLowerCase().trim()) : null);
      if (!customerKey) return;

      const total = Number(bill.totalAmount || bill.Total_Amount || 0);
      const paid = Number(bill.paidAmount || bill.Paid_Amount || 0);
      const balance = Number(bill.balanceAmount || bill.Balance_Amount || (total - paid) || 0);
      const date = bill.billDate || bill.Date || '';

      const existing = customerMap.get(customerKey) || (rawMobile ? customerMap.get(rawMobile) : null) || {
        mobile: rawMobile,
        name: name,
        address: address,
        totalBills: 0,
        totalPurchased: 0,
        totalPaid: 0,
        balanceUdhaari: 0,
        lastVisit: date,
        bills: []
      };

      if (!existing.bills.some(b => b.billNo === bill.billNo || (b.id && b.id === bill.id))) {
        existing.bills.push(bill);
      }
      if (date && (!existing.lastVisit || String(date) > String(existing.lastVisit))) {
        existing.lastVisit = date;
      }
      if (name && (!existing.name || existing.name === 'शेतकरी' || existing.name === 'ग्राहक')) existing.name = name;
      if (address && !existing.address) existing.address = address;
      if (rawMobile && !existing.mobile) existing.mobile = rawMobile;

      customerMap.set(customerKey, existing);
      if (rawMobile && customerKey !== rawMobile) customerMap.set(rawMobile, existing);
    });
  } catch (err) {
    console.warn('fetchAllShopCustomers remote sync error:', err);
  }

  const list = Array.from(new Set(customerMap.values())).sort((a, b) =>
    String(b.lastVisit || '').localeCompare(String(a.lastVisit || ''))
  );

  // Cache back to local storage
  if (list.length > 0) {
    const mapToSave = {};
    list.forEach(c => { if (c.mobile) mapToSave[c.mobile] = c; });
    writeStorage(STORAGE_KEYS.CUSTOMERS, mapToSave);
  }

  return list;
}

// ─── Sync Customers With Google Sheet ─────────────────────────────────────────
export async function syncCustomersWithSheet() {
  const config = getGoogleSheetsConfig();
  if (!config.webAppUrl) return { success: false, error: 'Web App URL जोडलेली नाही' };

  try {
    const res = await fetch(`${config.webAppUrl}${config.webAppUrl.includes('?') ? '&' : '?'}action=syncCustomers`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('syncCustomersWithSheet error:', err);
  }
  return { success: false };
}

// ─── Fetch All Bills (for Customer Analysis & Product Tracing) ─────────────────
export async function fetchAllBills(forceRefresh = false) {
  let remoteBills = [];
  try {
    const remote = await fetchGoogleSheetRecords('Bills', forceRefresh);
    if (Array.isArray(remote) && remote.length > 0) {
      remoteBills = remote.map((b) => normalizeBillRow(b));
    }
  } catch (err) {
    console.warn('fetchAllBills sheet fetch fallback:', err.message);
  }

  const localBills = (readStorage(STORAGE_KEYS.BILLS, []) || []).map((b) => normalizeBillRow(b));

  const billMap = new Map();
  // Remote bills first
  remoteBills.forEach((b) => {
    const key = String(b.billNo || b.billBookBillNo || b.id || '').trim();
    if (key) billMap.set(key, b);
  });
  // Overlay local bills so newly created/updated bills take precedence
  localBills.forEach((b) => {
    const key = String(b.billNo || b.billBookBillNo || b.id || '').trim();
    if (key) billMap.set(key, b);
    else billMap.set(`local_${Math.random()}`, b);
  });

  return Array.from(billMap.values());
}

// Re-export getSettingValue for convenience
export { getSettingValue } from './shopService';

// Return raw Google Apps Script template for the Admin UI copy button
export function getScriptTemplateCode() {
  return GOOGLE_APPS_SCRIPT_CODE;
}
