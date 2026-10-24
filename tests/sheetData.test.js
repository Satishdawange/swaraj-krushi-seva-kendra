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
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /sksk-customer-portal-v9/);
  assert.match(GOOGLE_APPS_SCRIPT_CODE, /Users records are not available through the public API/);
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
    const metrics = { totalSales: 1200, pendingKhata: [] };
    setDashboardMetricsCache("admin-1", metrics);
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
