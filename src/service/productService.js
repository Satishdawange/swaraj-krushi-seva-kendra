import { googleSheetsCategorySeed, googleSheetsProductSeed } from "../data/googleSheetsCatalog";
import { fetchGoogleSheetRecords } from "./googleSheetsService";

const value = (row, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== "") return row[key];
  }
  return undefined;
};

function normalizeProduct(row) {
  return {
    ...row,
    id: String(value(row, "Product_ID", "id", "ID") ?? ""),
    name: value(row, "Name_MR", "name", "Name") || "",
    nameEn: value(row, "Name_EN", "nameEn", "name_en") || "",
    name_en: value(row, "Name_EN", "name_en", "nameEn") || "",
    category: value(row, "Category_MR", "category", "Category") || "",
    categoryEn: value(row, "Category_EN", "categoryEn", "category_en") || "",
    category_en: value(row, "Category_EN", "category_en", "categoryEn") || "",
    company: value(row, "Company_MR", "company", "Company") || "",
    companyEn: value(row, "Company_EN", "companyEn", "company_en") || "",
    company_en: value(row, "Company_EN", "company_en", "companyEn") || "",
    price: Number(value(row, "Price", "price") || 0),
    is_active: String(value(row, "Is_Active", "is_active", "isActive") ?? true).toLowerCase() !== "false",
    image: value(row, "Image_URL", "image", "image_url") || "",
    short: value(row, "Short_MR", "short", "short_description") || "",
    description: value(row, "Description_MR", "description") || "",
    usage: value(row, "Usage_MR", "usage") || "",
  };
}

function normalizeCategory(row) {
  return {
    ...row,
    id: String(value(row, "Category_ID", "id", "ID") ?? ""),
    name: value(row, "Name_MR", "name", "Name") || "",
    nameEn: value(row, "Name_EN", "nameEn", "name_en") || "",
    name_en: value(row, "Name_EN", "name_en", "nameEn") || "",
    is_active: String(value(row, "Is_Active", "is_active", "isActive") ?? true).toLowerCase() !== "false",
    sort_order: Number(value(row, "Sort_Order", "sort_order", "sortOrder") || 0),
  };
}

export async function getProducts() {
  try {
    const records = await fetchGoogleSheetRecords("Products");
    if (records.length) return records.map(normalizeProduct).filter((p) => p.is_active);
  } catch (error) {
    console.warn("Could not load products from Google Sheets; using bundled catalog.", error);
  }
  return googleSheetsProductSeed.map(normalizeProduct).filter((p) => p.is_active);
}

export async function getProductById(id) {
  const products = await getProducts();
  return products.find((product) => product.id === String(id)) || null;
}

export async function getCategories() {
  try {
    const records = await fetchGoogleSheetRecords("Categories");
    if (records.length) return records.map(normalizeCategory).filter((c) => c.is_active);
  } catch (error) {
    console.warn("Could not load categories from Google Sheets; using bundled catalog.", error);
  }
  return googleSheetsCategorySeed.map(normalizeCategory).filter((c) => c.is_active);
}
