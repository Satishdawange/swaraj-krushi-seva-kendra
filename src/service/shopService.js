import ShopProp from "../config/shopProps";
import { fetchGoogleSheetRecords } from "./googleSheetsService";
import { normalizeShopSettingsRows } from "../utils/sheetData";

export async function getShopSettings() {
  try {
    const rows = await fetchGoogleSheetRecords("Settings");
    return normalizeShopSettingsRows(rows, ShopProp);
  } catch (error) {
    console.warn("Using bundled shop details because the Settings tab could not be read.", error);
    return { ...ShopProp };
  }
}
