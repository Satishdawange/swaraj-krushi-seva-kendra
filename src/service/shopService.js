import ShopProp from "../config/shopProps";
import { fetchGoogleSheetRecords } from "./googleSheetsService";
import { normalizeShopSettingsRows } from "../utils/sheetData";

// Synchronously read any setting from the local settings cache
export function getSettingValue(key, defaultValue = "") {
  try {
    const cache = JSON.parse(localStorage.getItem("sksk_sheet_settings_cache") || "[]");
    if (Array.isArray(cache)) {
      const normKey = String(key || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
      const found = cache.find((s) => {
        const k = String(s.key || s.Key || s.name || s.Name || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
        return k === normKey;
      });
      if (found && found.value !== undefined && found.value !== "") {
        return String(found.value).trim();
      }
    }
  } catch (e) {
    // ignore
  }
  return defaultValue;
}

// Check boolean feature flag from properties (e.g. show_home_delivery, show_ai_advisor)
export function isFeatureEnabled(key, defaultEnabled = true) {
  const val = getSettingValue(key, defaultEnabled ? "true" : "false").toLowerCase();
  return val === "true" || val === "1" || val === "yes" || val === "on";
}

// Synchronously get all merged shop properties (uses cache, falls back to bundled defaults)
export function getShopInfo() {
  return {
    name: getSettingValue("shop_name", ShopProp.name),
    fullName: getSettingValue("full_name", ShopProp.fullName),
    ownerName: getSettingValue("owner_name", ShopProp.ownerName),
    phone: getSettingValue("phone", ShopProp.phone),
    whatsapp: getSettingValue("whatsapp", ShopProp.whatsapp),
    address: getSettingValue("address", ShopProp.address),
    pincode: getSettingValue("pincode", ShopProp.pincode),
    gstNumber: getSettingValue("gst_number", ""),
    billGstPercent: Number(getSettingValue("bill_gst_percent", "0")) || 0,
    showHomeDelivery: isFeatureEnabled("show_home_delivery", false),
    showAiAdvisor: isFeatureEnabled("show_ai_advisor", true),
    showProductRequest: isFeatureEnabled("show_product_request", true),
    lowStockAlertQty: Number(getSettingValue("low_stock_alert_qty", "5")) || 5,
  };
}

export async function getShopSettings() {
  try {
    const rows = await fetchGoogleSheetRecords("Settings");
    if (Array.isArray(rows) && rows.length > 0) {
      // Keep cache up to date
      const normalizedCache = rows.map((r) => ({
        key: String(r.key || r.Key || r.name || r.Name || "").trim(),
        value: String(r.value || r.Value || "").trim(),
        description: String(r.description || r.Description || "").trim(),
      })).filter((r) => r.key);
      if (normalizedCache.length > 0) {
        localStorage.setItem("sksk_sheet_settings_cache", JSON.stringify(normalizedCache));
      }
    }
    return normalizeShopSettingsRows(rows, ShopProp);
  } catch (error) {
    console.warn("Using bundled/cached shop details because the Settings tab could not be read.", error);
    return getShopInfo();
  }
}
