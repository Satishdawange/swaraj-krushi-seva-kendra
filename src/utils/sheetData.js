export const readSheetField = (row, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return undefined;
};

export function normalizeInventoryRow(row) {
  return {
    ...row,
    id: String(readSheetField(row, "ID", "id", "Product_ID", "Product ID", "productId") ?? ""),
    name: readSheetField(row, "Name", "name", "Product_Name", "Product Name", "Name_MR", "Name_EN", "nameEn") || "",
    nameEn: readSheetField(row, "Name_EN", "Name EN", "nameEn", "name_en") || "",
    category: readSheetField(row, "Category", "category", "Category_MR", "Category Name") || "",
    categoryEn: readSheetField(row, "Category_EN", "categoryEn", "category_en") || "",
    subcategory: readSheetField(row, "Subcategory", "subcategory") || "",
    company: readSheetField(row, "Company", "company", "Company_MR") || "",
    companyEn: readSheetField(row, "Company_EN", "companyEn", "company_en") || "",
    unit: readSheetField(row, "Unit", "unit") || "",
    purchasePrice: Number(readSheetField(row, "Purchase_Price", "Purchase Price", "purchasePrice", "purchase_price", "Cost_Price") || 0),
    sellingPrice: Number(readSheetField(row, "Selling_Price", "Selling Price", "sellingPrice", "selling_price", "Price") || 0),
    availableStock: Number(readSheetField(row, "Available_Stock", "Available Stock", "availableStock", "available_stock", "Current_Stock", "Current Stock", "Stock_Qty", "Quantity", "Qty") || 0),
    minAlertQty: Number(readSheetField(row, "Min_Alert_Qty", "Min Alert Qty", "minAlertQty", "min_alert_qty", "Alert_Qty") || 0),
    updatedAt: readSheetField(row, "Updated_At", "updatedAt", "updated_at") || "",
  };
}

export function filterSheetRows(rows = [], { search = "", category = "" } = {}) {
  let filtered = rows;
  if (search) {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(term)));
  }
  if (category) {
    const variants = (value) => {
      const text = String(value || "").trim().toLowerCase();
      const parenthetical = [...text.matchAll(/\(([^)]+)\)/g)].map((match) => match[1].trim());
      const base = text.replace(/\s*\([^)]*\)/g, "").trim();
      return new Set([text, base, ...parenthetical].filter(Boolean));
    };
    const selected = variants(category);
    filtered = filtered.filter((row) => {
      const rowCategory = row.category ?? row.Category ?? row.Category_MR ?? row.Category_EN ?? row.Category_Name ?? row["Category Name"] ?? row.Category_ID ?? row.category_id ?? "";
      const candidates = variants(rowCategory);
      const categoryId = row.Category_ID ?? row.category_id ?? "";
      if (categoryId) candidates.add(String(categoryId).trim().toLowerCase());
      return [...selected].some((value) => candidates.has(value));
    });
  }
  return filtered;
}

const normalizeKey = (value) => String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

export function normalizeShopSettingsRows(rows = [], fallback = {}) {
  const settings = { ...fallback };
  const values = {};
  rows.forEach((row) => {
    const key = row.Key ?? row.key ?? row.Setting ?? row.setting ?? row.Name ?? row.name;
    const value = row.Value ?? row.value ?? row.Setting_Value ?? row.setting_value;
    if (key && value !== undefined) values[normalizeKey(key)] = value;
  });
  const aliases = {
    name: ["name", "shopname", "storename"],
    fullName: ["fullname", "shopfullname", "marathiname"],
    ownerName: ["ownername", "proprietor", "owner"],
    phone: ["phone", "mobile", "contact", "contactnumber"],
    whatsapp: ["whatsapp", "whatsappnumber"],
    address: ["address", "shopaddress", "postaladdress"],
    pincode: ["pincode", "postalcode", "zipcode"],
  };
  Object.entries(aliases).forEach(([field, keys]) => {
    const match = keys.find((key) => values[key] !== undefined && values[key] !== "");
    if (match) settings[field] = String(values[match]);
  });
  if (rows.length) {
    const row = rows[0];
    settings.name = row.Name || row.name || settings.name;
    settings.fullName = row.Full_Name || row.full_name || settings.fullName;
    settings.ownerName = row.Owner_Name || row.owner_name || settings.ownerName;
    settings.phone = row.Phone || row.phone || settings.phone;
    settings.whatsapp = row.WhatsApp || row.whatsapp || settings.whatsapp;
    settings.address = row.Address || row.address || settings.address;
    settings.pincode = row.Pincode || row.pincode || settings.pincode;
  }
  return settings;
}
