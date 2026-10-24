export const readSheetField = (row, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return undefined;
};

export function normalizeInventoryRow(row) {
  const activeValue = readSheetField(row, "Is_Active", "is_active", "Is Active", "Active");
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
    pack: readSheetField(row, "Pack", "pack") || "",
    purchasePrice: Number(readSheetField(row, "Purchase_Price", "Purchase Price", "purchasePrice", "purchase_price", "Cost_Price") || 0),
    sellingPrice: Number(readSheetField(row, "Selling_Price", "Selling Price", "sellingPrice", "selling_price", "Price") || 0),
    availableStock: Number(readSheetField(row, "Available_Stock", "Available Stock", "availableStock", "available_stock", "Current_Stock", "Current Stock", "Stock_Qty", "Quantity", "Qty") || 0),
    minAlertQty: Number(readSheetField(row, "Min_Alert_Qty", "Min Alert Qty", "minAlertQty", "min_alert_qty", "Alert_Qty") || 0),
    badge: readSheetField(row, "Badge_MR", "Badge", "badge") || "",
    image: readSheetField(row, "Image_URL", "Image URL", "image", "image_url") || "",
    short: readSheetField(row, "Short_MR", "Short Description", "short", "short_description") || "",
    description: readSheetField(row, "Description_MR", "Description", "description") || "",
    usage: readSheetField(row, "Usage_MR", "Usage", "usage") || "",
    crops: readSheetField(row, "Crops_MR", "Crops", "crops") || "",
    isActive: activeValue === undefined || String(activeValue).trim().toLowerCase() === "true",
    updatedAt: readSheetField(row, "Updated_At", "updatedAt", "updated_at") || "",
  };
}

export function normalizeBillRow(row) {
  let items = readSheetField(row, "Items_JSON", "items_json", "items") || [];
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  if (!Array.isArray(items)) items = [];
  return {
    ...row,
    billNo: readSheetField(row, "Bill_No", "billNo", "bill_no", "id") || "",
    billBookBillNo: readSheetField(row, "Billbook_Bill_No", "Billbook Bill No", "billBookBillNo", "billbook_bill_no") || "",
    billDate: readSheetField(row, "Date", "billDate", "bill_date", "date") || "",
    customerName: readSheetField(row, "Customer_Name", "customerName", "customer_name") || "",
    customerMobile: readSheetField(row, "Mobile", "customerMobile", "mobile", "mobile_number") || "",
    customerAddress: readSheetField(row, "Address", "customerAddress", "customer_address") || "",
    totalAmount: Number(readSheetField(row, "Total_Amount", "totalAmount", "total_amount") || 0),
    paidAmount: Number(readSheetField(row, "Paid_Amount", "paidAmount", "paid_amount") || 0),
    balanceAmount: Number(readSheetField(row, "Balance_Amount", "balanceAmount", "balance_amount") || 0),
    paymentStatus: readSheetField(row, "Payment_Status", "paymentStatus", "payment_status") || "",
    paymentMode: readSheetField(row, "Payment_Mode", "paymentMode", "payment_mode") || "Cash",
    items: items.map((item) => ({
      ...item,
      id: item.id || item.inventoryId || item.productId || "",
      name: item.name || item.Name || item.Name_MR || item.nameEn || item.Name_EN || "",
      nameEn: item.nameEn || item.Name_EN || item.name_en || "",
      qty: Number(item.qty ?? item.Quantity ?? item.quantity ?? 0),
      unit: item.unit || item.Unit || "नग",
      price: Number(item.price ?? item.Price ?? 0),
      total: Number(item.total ?? item.Total ?? 0),
    })),
    notes: readSheetField(row, "Notes", "notes") || "",
    createdAt: readSheetField(row, "Created_At", "createdAt", "created_at") || "",
    updatedAt: readSheetField(row, "Updated_At", "updatedAt", "updated_at") || "",
  };
}

export function normalizePurchaseLotRow(row) {
  const bulkQty = Number(readSheetField(row, "Bulk_Qty", "bulkQty", "bulk_qty", "Quantity", "Qty") || 0);
  const totalCost = Number(readSheetField(row, "Total_Cost", "totalCost", "total_cost") || 0);
  return {
    ...row,
    lotId: readSheetField(row, "Lot_ID", "lotId", "lot_id", "ID") || "",
    date: readSheetField(row, "Date", "date") || "",
    supplier: readSheetField(row, "Supplier", "supplier") || "",
    category: readSheetField(row, "Category", "category", "Category_MR") || "",
    productName: readSheetField(row, "Product_Name", "productName", "product_name", "Name") || "",
    productNameEn: readSheetField(row, "Product_Name_EN", "productNameEn", "product_name_en", "Name_EN") || "",
    bulkQty,
    unit: readSheetField(row, "Unit", "unit") || "",
    totalCost,
    unitCost: Number(readSheetField(row, "Unit_Cost", "unitCost", "unit_cost") || (bulkQty ? totalCost / bulkQty : totalCost)),
    sellingPrice: Number(readSheetField(row, "Selling_Price", "sellingPrice", "selling_price") || 0),
    notes: readSheetField(row, "Notes", "notes") || "",
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
      const rowCategories = [
        row.category, row.Category, row.Category_MR, row.Category_EN,
        row.Category_Name, row["Category Name"], row.Category_ID, row.category_id
      ].filter(Boolean);
      const candidates = new Set(rowCategories.flatMap((value) => [...variants(value)]));
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
