import test from "node:test";
import assert from "node:assert/strict";
import { filterSheetRows, normalizeBillRow, normalizeInventoryRow, normalizePurchaseLotRow, normalizeShopSettingsRows } from "../src/utils/sheetData.js";
import { buildDashboardAnalytics } from "../src/utils/dashboardAnalytics.js";
import { GOOGLE_APPS_SCRIPT_CODE } from "../src/utils/googleAppsScriptTemplate.js";
import {
  clearDashboardMetricsCache,
  getDashboardMetricsCache,
  setDashboardMetricsCache
} from "../src/utils/dashboardCache.js";

test("Apps Script template includes valid revocable session endpoints", () => {
  assert.doesNotThrow(() => new Function(GOOGLE_APPS_SCRIPT_CODE));
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /case 'validateSession'/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /case 'logout'/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /credentialFingerprint/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /Token_Hash/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /function getRecordValue/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /Billbook_Bill_No/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /stockColumn = invHeaders\.findIndex/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /case 'changePassword'/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /function ensureCustomerUser/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /CUST-/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /case 'getMyBills'/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /function getBillsForCustomer/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /function requireStaffOrAdmin/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /function publicInventoryRecord/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /function publicProductRecord/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /function inventoryWithoutPricingRecord/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /sksk-customer-portal-v10/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /case 'getDashboardMetrics'/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /Bills_\[0-9\]\{4\}_\[0-9\]\{2\}/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /const recentNeedsStaff = isBillsSheetName\(recentSheet\)/);
  const isBillsSheetName = new Function(`${GOOGLE_APPS_SCRIPT_CODE}; return isBillsSheetName;`)();
  assert.equal(isBillsSheetName("Bills_2026_10"), true);
  assert.equal(isBillsSheetName("Inventory"), false);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /Users records are not available through the public API/);
});

test("dashboard endpoint reads the selected monthly tab and paginates filtered bills", () => {
  const createSheet = (name, values) => ({
    getName: () => name,
    getLastRow: () => values.length,
    getLastColumn: () => values[0]?.length || 0,
    getRange: (row, column, rowCount = 1, columnCount = 1) => ({
      getValues: () => values.slice(row - 1, row - 1 + rowCount)
        .map((line) => line.slice(column - 1, column - 1 + columnCount)),
    }),
  });
  const sheets = [
    createSheet("Bills_2026_10", [
      ["Bill_No", "Date", "Customer_Name", "Total_Amount", "Paid_Amount", "Balance_Amount", "Items_JSON"],
      ["B-1", "2026-10-26", "Customer A", 100, 50, 50, JSON.stringify([{ productId: "p-1", qty: 1, price: 100 }])],
      ["B-2", "2026-10-26", "Customer B", 60, 60, 0, JSON.stringify([{ category: "Seeds", qty: 1, price: 60 }])],
      ["B-4", "2026-10-26", "Customer D", 20, 20, 0, JSON.stringify([{ productId: "p-1", qty: 1, price: 20 }])],
      ["B-3", "2026-10-27", "Customer C", 40, 0, 40, JSON.stringify([{ productId: "p-1", qty: 1, price: 40 }])],
    ]),
    createSheet("Inventory", [
      ["ID", "Name", "Category", "Purchase_Price", "Available_Stock", "Min_Alert_Qty"],
      ["p-1", "Fertilizer", "Fertilizers", 10, 1, 5],
    ]),
    createSheet("Customers", [
      ["Mobile", "Customer_Name", "Total_Purchased", "Balance_Udhaari"],
      ["9999999999", "Customer A", 100, 50],
    ]),
    createSheet("Challans", [["Challan_No", "Date"], ["C-1", "2026-10-26"]]),
  ];
  const spreadsheet = {
    getSheets: () => sheets,
    getSheetByName: (name) => sheets.find((sheet) => sheet.getName() === name) || null,
  };
  const utilities = {
    formatDate: (date, _timezone, format) => format === "yyyy-MM"
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
  };
  const getMetrics = new Function("Utilities", "Session", `${GOOGLE_APPS_SCRIPT_CODE}; return getDashboardMetricsForRange;`)(
    utilities,
    { getScriptTimeZone: () => "UTC" },
  );

  const result = getMetrics(spreadsheet, {
    startDate: "2026-10-26",
    endDate: "2026-10-26",
    category: "Fertilizers",
    search: "",
    status: "all",
    page: "1",
    limit: "1",
  });

  assert.equal(result.data.totalBills, 2);
  assert.deepEqual(result.data.selectedTotals, { sales: 120, paid: 70, due: 50 });
  assert.equal(result.data.bills.length, 1);
  assert.equal(result.data.bills[0].billNo, "B-1");
  assert.deepEqual(result.data.billPagination, { page: 1, limit: 1, total: 2, totalPages: 2 });
  const secondPage = getMetrics(spreadsheet, {
    startDate: "2026-10-26",
    endDate: "2026-10-26",
    category: "Fertilizers",
    search: "Customer D",
    status: "all",
    page: "1",
    limit: "1",
  });
  assert.equal(secondPage.data.billPagination.total, 1);
  assert.equal(secondPage.data.bills[0].billNo, "B-4");
});

test("dashboard cache is isolated by account and can be cleared", () => {
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  try {
    values.set("sksk_dashboard_metrics:admin-1", JSON.stringify({ metrics: { stale: true } }));
    const metrics = { totalSales: 1200, pendingKhata: [] };
    setDashboardMetricsCache("admin-1", metrics);
    assert.equal(values.has("sksk_dashboard_metrics:admin-1"), false);
    assert.deepEqual(getDashboardMetricsCache("admin-1").metrics, metrics);
    assert.equal(getDashboardMetricsCache("admin-2"), null);
    clearDashboardMetricsCache("admin-1");
    assert.equal(getDashboardMetricsCache("admin-1"), null);
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});

test("normalizes the Apps Script Inventory headers used by the sheet", () => {
  const item = normalizeInventoryRow({
    ID: "p-1",
    Name: "मराठी नाव",
    Name_EN: "English name",
    Category: "खते",
    Purchase_Price: 120,
    Selling_Price: 150,
    Available_Stock: 7,
    Min_Alert_Qty: 3,
  });

  assert.equal(item.id, "p-1");
  assert.equal(item.name, "मराठी नाव");
  assert.equal(item.nameEn, "English name");
  assert.equal(item.category, "खते");
  assert.equal(item.purchasePrice, 120);
  assert.equal(item.sellingPrice, 150);
  assert.equal(item.availableStock, 7);
  assert.equal(item.minAlertQty, 3);
});

test("normalizes alternate spreadsheet headers and preserves legitimate zero stock", () => {
  const item = normalizeInventoryRow({ "Product Name": "Urea", "Current Stock": 0, "Selling Price": "99.5" });
  assert.equal(item.name, "Urea");
  assert.equal(item.availableStock, 0);
  assert.equal(item.sellingPrice, 99.5);
});

test("normalizes inventory portal fields and active status", () => {
  const item = normalizeInventoryRow({
    ID: "inv-2",
    Name: "मराठी उत्पादन",
    Name_EN: "English product",
    Pack: "500 ml",
    Image_URL: "https://example.test/image.png",
    Short_MR: "थोडक्यात",
    Description_MR: "सविस्तर माहिती",
    Crops_MR: "कांदा, द्राक्ष",
    Is_Active: "false",
  });

  assert.equal(item.nameEn, "English product");
  assert.equal(item.pack, "500 ml");
  assert.equal(item.image, "https://example.test/image.png");
  assert.equal(item.short, "थोडक्यात");
  assert.equal(item.description, "सविस्तर माहिती");
  assert.equal(item.crops, "कांदा, द्राक्ष");
  assert.equal(item.isActive, false);
  assert.equal(normalizeInventoryRow({ Name: "Legacy product" }).isActive, true);
});

test("normalizes billbook IDs and JSON item rows from Google Sheets", () => {
  const bill = normalizeBillRow({
    Bill_No: "SKSK-1",
    Billbook_Bill_No: "0042",
    Date: "2026-10-24",
    Customer_Name: "Customer",
    Mobile: "9876543210",
    Items_JSON: JSON.stringify([{ Name: "मराठी नाव", Name_EN: "English name", Quantity: 2, Unit: "बॅग", Price: 50 }]),
  });

  assert.equal(bill.billNo, "SKSK-1");
  assert.equal(bill.billBookBillNo, "0042");
  assert.equal(bill.customerName, "Customer");
  assert.equal(bill.items[0].name, "मराठी नाव");
  assert.equal(bill.items[0].nameEn, "English name");
  assert.equal(bill.items[0].qty, 2);
  assert.equal(bill.items[0].price, 50);
});

test("normalizes raw Purchase_Lots headers for history display", () => {
  const lot = normalizePurchaseLotRow({
    Lot_ID: "LOT-7",
    Date: "2026-10-25",
    Supplier: "Agro Dealer",
    Product_Name: "मराठी उत्पादन",
    Bulk_Qty: 12,
    Unit: "बाटली",
    Total_Cost: 1200,
    Unit_Cost: 100,
    Selling_Price: 140,
  });

  assert.equal(lot.lotId, "LOT-7");
  assert.equal(lot.productName, "मराठी उत्पादन");
  assert.equal(lot.bulkQty, 12);
  assert.equal(lot.unitCost, 100);
  assert.equal(lot.sellingPrice, 140);
});

test("filters sheet rows by category before pagination, regardless of header casing", () => {
  const rows = [
    { Category: "Fertilizers", Name: "Urea" },
    { category: "Seeds", name: "Groundnut" },
    { Category_MR: "Fertilizers", Name: "DAP" },
  ];
  assert.deepEqual(filterSheetRows(rows, { category: "fertilizers" }), [rows[0], rows[2]]);
  assert.deepEqual(filterSheetRows(rows, { category: "Seeds", search: "ground" }), [rows[1]]);
  assert.deepEqual(filterSheetRows([{ Category: "खते" }], { category: "खते (Fertilizers)" }), [{ Category: "खते" }]);
  assert.deepEqual(filterSheetRows([{ Category: "Fertilizers", Category_ID: "cat-1" }], { category: "cat-1" }), [{ Category: "Fertilizers", Category_ID: "cat-1" }]);
  const bilingualRow = { Category: "खते", Category_EN: "Fertilizers", Name: "Urea" };
  assert.deepEqual(filterSheetRows([bilingualRow], { category: "खते" }), [bilingualRow]);
  assert.deepEqual(filterSheetRows([bilingualRow], { category: "Fertilizers" }), [bilingualRow]);
});

test("reads key-value shop settings and falls back for missing values", () => {
  const settings = normalizeShopSettingsRows([
    { Key: "shop_name", Value: "Test Shop" },
    { Key: "owner_name", Value: "A. Owner" },
    { Key: "address", Value: "Test address" },
  ], { phone: "000" });

  assert.equal(settings.name, "Test Shop");
  assert.equal(settings.ownerName, "A. Owner");
  assert.equal(settings.address, "Test address");
  assert.equal(settings.phone, "000");
});

test("filters dashboard sales by date range and product category", () => {
  const result = buildDashboardAnalytics({
    now: new Date(2025, 2, 15, 12),
    period: "month",
    categoryFilter: "Fertilizers",
    metrics: {
      inventory: [{ id: "p1", name: "Urea", category: "Fertilizers" }],
      bills: [
        {
          billDate: "2025-03-15",
          totalAmount: 300,
          paidAmount: 150,
          balanceAmount: 150,
          items: [{ productId: "p1", qty: 2, price: 100, total: 200 }, { name: "Other", qty: 1, price: 100, total: 100, category: "Seeds" }],
        },
        { billDate: "2025-02-28", totalAmount: 500, paidAmount: 500, balanceAmount: 0, items: [{ productId: "p1", qty: 5, price: 100, total: 500 }] },
      ],
    },
  });

  assert.equal(result.filteredBills.length, 1);
  assert.deepEqual(result.selectedTotals, { sales: 200, paid: 100, due: 100 });
  assert.deepEqual(result.categoryData, [["Fertilizers", 200], ["Seeds", 100]]);
  assert.equal(result.chartData.find((point) => point.label === "2025-03-15").value, 200);
});

test("calculates analytics accurately with 10,000 inventory items and bills", () => {
  const inventory = Array.from({ length: 10_000 }, (_, index) => ({
    id: `product-${index}`,
    name: `Product ${index}`,
    nameEn: `Item ${index}`,
    category: index === 9_999 ? "Fertilizers" : "Other",
  }));
  const bills = Array.from({ length: 10_000 }, (_, index) => ({
    billDate: "2025-03-15",
    totalAmount: 100,
    paidAmount: 75,
    balanceAmount: 25,
    items: [{ productId: "product-9999", qty: 1, price: 100 }],
  }));

  const result = buildDashboardAnalytics({
    now: new Date(2025, 2, 15, 12),
    period: "month",
    categoryFilter: "Fertilizers",
    metrics: { inventory, bills },
  });

  assert.equal(result.filteredBills.length, 10_000);
  assert.deepEqual(result.selectedTotals, { sales: 1_000_000, paid: 750_000, due: 250_000 });
  assert.deepEqual(result.categoryData, [["Fertilizers", 1_000_000]]);
});

test("custom dashboard month range includes both endpoint months", () => {
  const result = buildDashboardAnalytics({
    now: new Date(2025, 5, 10, 12),
    period: "custom",
    fromMonth: "2025-01",
    toMonth: "2025-02",
    metrics: {
      bills: [
        { billDate: "2025-01-01", totalAmount: 10, items: [] },
        { billDate: "2025-02-28", totalAmount: 20, items: [] },
        { billDate: "2025-03-01", totalAmount: 30, items: [] },
      ],
    },
  });

  assert.equal(result.selectedTotals.sales, 30);
  assert.deepEqual(result.chartData.map((point) => point.label), ["2025-01", "2025-02"]);
});
