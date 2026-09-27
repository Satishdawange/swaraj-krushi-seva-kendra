import { supabase } from "../config/supabase";

// Extract initials from user name (e.g., "Rahul Patil" -> "RP")
export function extractInitials(name) {
  if (!name || typeof name !== "string") return "SK";
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return clean.substring(0, Math.min(2, clean.length)).toUpperCase();
  }
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return (first + last).toUpperCase();
}

// Clean mobile number (strip +91, 0, non-digits to get exact 10 digits)
export function cleanMobileNumber(mobile) {
  if (!mobile) return "";
  let digits = String(mobile).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

// Unique Digital Billing Number: Date (YYYYMMDD) + Time Seconds (HHMMSS) + User Initials
export function generateDigitalBillNumber(customerName = "") {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const SS = String(now.getSeconds()).padStart(2, "0");

  const initials = extractInitials(customerName);
  return `SKSK-${YYYY}${MM}${DD}-${HH}${min}${SS}-${initials}`;
}

// Preview format displayed in read-only input before final submission
export function generatePreviewBillNo(customerName = "") {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const initials = extractInitials(customerName);
  return `SKSK-${YYYY}${MM}${DD}-******-${initials}`;
}

// Convert amount to Marathi words
export function numberToMarathiWords(amount) {
  const num = Math.floor(Number(amount) || 0);
  if (num === 0) return "शून्य रुपये फक्त";

  const units = [
    "",
    "एक",
    "दोन",
    "तीन",
    "चार",
    "पाच",
    "सहा",
    "सात",
    "आठ",
    "नऊ",
    "दहा",
    "अकरा",
    "बारा",
    "तेरा",
    "चौदा",
    "पंधरा",
    "सोळा",
    "सतरा",
    "अठरा",
    "एकोणीस",
  ];
  const tens = [
    "",
    "",
    "वीस",
    "तीस",
    "चाळीस",
    "पन्नास",
    "साठ",
    "सत्तर",
    "ऐंशी",
    "नव्वद",
  ];

  function convertTwoDigits(n) {
    if (n === 0) return "";
    if (n < 20) return units[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return `${tens[t]}${u ? " " + units[u] : ""}`;
  }

  let words = "";
  const crore = Math.floor(num / 10000000);
  const remainderCrore = num % 10000000;
  const lakh = Math.floor(remainderCrore / 100000);
  const remainderLakh = remainderCrore % 100000;
  const thousand = Math.floor(remainderLakh / 1000);
  const remainderThousand = remainderLakh % 1000;
  const hundred = Math.floor(remainderThousand / 100);
  const remainderHundred = remainderThousand % 100;

  if (crore > 0) words += `${convertTwoDigits(crore)} कोटी `;
  if (lakh > 0) words += `${convertTwoDigits(lakh)} लाख `;
  if (thousand > 0) words += `${convertTwoDigits(thousand)} हजार `;
  if (hundred > 0) words += `${convertTwoDigits(hundred)} शे `;
  if (remainderHundred > 0) words += `${convertTwoDigits(remainderHundred)} `;

  return `${words.trim()} रुपये फक्त`;
}

// Safe local backup helpers to handle SSR, Node, or browser environments safely
function getLocalBackup() {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(
      localStorage.getItem("sksk_customer_bills_backup") || "{}",
    );
  } catch (e) {
    return {};
  }
}

function saveLocalBackup(data) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("sksk_customer_bills_backup", JSON.stringify(data));
  } catch (e) {}
}

// Save bill into Supabase (customer_bills table) with mobile number as primary key
// Appends to JSON array if user exists, else creates new row
export async function saveCustomerBill(billData) {
  const mobile = cleanMobileNumber(billData.customerMobile);
  const customerName = billData.customerName?.trim();
  const customerAddress = billData.customerAddress?.trim() || null;

  const newBillRecord = {
    billNo: billData.billNo,
    billDate: billData.billDate || new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
    customerName,
    customerMobile: mobile,
    customerAddress,
    items: billData.items || [],
    totalAmount: Number(billData.totalAmount || 0),
    paymentMode: billData.paymentMode || "Cash",
    notes: billData.notes?.trim() || "",
  };

  // 1. Local backup cache to ensure zero data loss
  try {
    const existingBackup = getLocalBackup();
    if (!existingBackup[mobile]) {
      existingBackup[mobile] = {
        mobile_number: mobile,
        customer_name: customerName,
        customer_address: customerAddress,
        bills: [],
      };
    }
    existingBackup[mobile].customer_name = customerName;
    if (customerAddress)
      existingBackup[mobile].customer_address = customerAddress;
    existingBackup[mobile].bills.unshift(newBillRecord);
    saveLocalBackup(existingBackup);
  } catch (err) {
    console.warn("LocalStorage backup warning:", err);
  }

  // 2. Save / Update in Supabase customer_bills table
  try {
    // Check if customer already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("customer_bills")
      .select("mobile_number, bills")
      .eq("mobile_number", mobile)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.warn("Supabase fetch error:", fetchError.message);
    }

    if (existingUser) {
      // Existing customer: append new bill to JSON array
      const existingBills = Array.isArray(existingUser.bills)
        ? existingUser.bills
        : [];
      const updatedBills = [newBillRecord, ...existingBills];

      const { data, error } = await supabase
        .from("customer_bills")
        .update({
          customer_name: customerName,
          customer_address: customerAddress,
          bills: updatedBills,
          updated_at: new Date().toISOString(),
        })
        .eq("mobile_number", mobile)
        .select()
        .single();

      if (error) throw error;
      return { data, bill: newBillRecord, status: "updated_existing_customer" };
    } else {
      // New customer: insert new row with primary key = mobile
      const { data, error } = await supabase
        .from("customer_bills")
        .insert({
          mobile_number: mobile,
          customer_name: customerName,
          customer_address: customerAddress,
          bills: [newBillRecord],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, bill: newBillRecord, status: "created_new_customer" };
    }
  } catch (err) {
    console.error("Database save error:", err);
    return {
      bill: newBillRecord,
      status: "saved_locally_only",
      error: err.message,
    };
  }
}

// Retrieve customer record and bills by 10-digit mobile number
export async function getCustomerBills(mobileNumber) {
  const mobile = cleanMobileNumber(mobileNumber);
  if (!mobile || mobile.length !== 10) return null;

  try {
    const { data, error } = await supabase
      .from("customer_bills")
      .select("*")
      .eq("mobile_number", mobile)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn("Supabase fetch error for customer bills:", err);
  }

  // Check local storage backup
  try {
    const localBackup = getLocalBackup();
    if (localBackup[mobile]) {
      return localBackup[mobile];
    }
  } catch (e) {
    console.warn("Local backup fetch error:", e);
  }

  return null;
}

// Retrieve all bills flattened for admin view, newest first
export async function getAllCustomerBills() {
  let customerRows = [];

  try {
    const { data, error } = await supabase
      .from("customer_bills")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && data && data.length > 0) {
      customerRows = data;
    }
  } catch (err) {
    console.warn("Error fetching from Supabase, loading local backup:", err);
  }

  // Fallback / merge local backup if needed
  if (customerRows.length === 0) {
    try {
      const localBackup = getLocalBackup();
      customerRows = Object.values(localBackup);
    } catch (e) {
      customerRows = [];
    }
  }

  // Flatten customer bills into a single array for chronological view
  const allBills = [];
  customerRows.forEach((customer) => {
    const billsList = Array.isArray(customer.bills) ? customer.bills : [];
    billsList.forEach((b) => {
      allBills.push({
        ...b,
        customerName: b.customerName || customer.customer_name,
        customerMobile: b.customerMobile || customer.mobile_number,
        customerAddress: b.customerAddress || customer.customer_address,
      });
    });
  });

  // Sort by date / creation time descending
  allBills.sort(
    (a, b) =>
      new Date(b.createdAt || b.billDate) - new Date(a.createdAt || a.billDate),
  );

  return {
    allBills,
    customerRows,
  };
}

// Compute field-by-field differences between old bill and updated bill
export function computeBillDiff(oldBill, newBill) {
  if (!oldBill || !newBill) return [];
  const changes = [];

  // Customer Name
  if (
    (oldBill.customerName || "").trim() !== (newBill.customerName || "").trim()
  ) {
    changes.push({
      field: "customerName",
      label: "ग्राहकाचे नाव (Customer Name)",
      previousValue: oldBill.customerName || "—",
      currentValue: newBill.customerName || "—",
    });
  }

  // Address
  if (
    (oldBill.customerAddress || "").trim() !==
    (newBill.customerAddress || "").trim()
  ) {
    changes.push({
      field: "customerAddress",
      label: "पत्ता (Address)",
      previousValue: oldBill.customerAddress || "—",
      currentValue: newBill.customerAddress || "—",
    });
  }

  // Bill Date
  if (oldBill.billDate !== newBill.billDate) {
    changes.push({
      field: "billDate",
      label: "बिलाची तारीख (Bill Date)",
      previousValue: oldBill.billDate || "—",
      currentValue: newBill.billDate || "—",
    });
  }

  // Payment Mode
  if (oldBill.paymentMode !== newBill.paymentMode) {
    changes.push({
      field: "paymentMode",
      label: "पेमेंट प्रकार (Payment Mode)",
      previousValue: oldBill.paymentMode || "—",
      currentValue: newBill.paymentMode || "—",
    });
  }

  // Notes
  if ((oldBill.notes || "").trim() !== (newBill.notes || "").trim()) {
    changes.push({
      field: "notes",
      label: "नोंद / शेरा (Notes)",
      previousValue: oldBill.notes || "—",
      currentValue: newBill.notes || "—",
    });
  }

  // Items List
  const oldItems = oldBill.items || [];
  const newItems = newBill.items || [];
  const itemsChanged = JSON.stringify(oldItems) !== JSON.stringify(newItems);
  if (itemsChanged) {
    const formatItemsSummary = (list) =>
      list
        .map((i) => `${i.name} (${i.qty} ${i.unit || "नग"} @ ₹${i.price})`)
        .join(", ");

    changes.push({
      field: "items",
      label: "उत्पादने व दर (Items & Rates)",
      previousValue: formatItemsSummary(oldItems) || "काहीही नाही",
      currentValue: formatItemsSummary(newItems) || "काहीही नाही",
    });
  }

  // Total Amount
  if (Number(oldBill.totalAmount) !== Number(newBill.totalAmount)) {
    changes.push({
      field: "totalAmount",
      label: "एकूण रक्कम (Grand Total)",
      previousValue: `₹ ${Number(oldBill.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      currentValue: `₹ ${Number(newBill.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    });
  }

  return changes;
}

// Update an existing bill in customer_bills table with audit activity logging
export async function updateCustomerBill(originalBillNo, updatedBillData) {
  const mobile = cleanMobileNumber(updatedBillData.customerMobile);
  const customerName = updatedBillData.customerName?.trim();
  const customerAddress = updatedBillData.customerAddress?.trim() || null;

  // 1. Fetch current existing bill from local backup or Supabase to calculate diff
  let existingBill = null;
  let currentBillsList = [];
  let customerRow = null;

  try {
    const { data, error } = await supabase
      .from("customer_bills")
      .select("*")
      .eq("mobile_number", mobile)
      .single();

    if (!error && data) {
      customerRow = data;
      currentBillsList = Array.isArray(data.bills) ? data.bills : [];
      existingBill = currentBillsList.find((b) => b.billNo === originalBillNo);
    }
  } catch (err) {
    console.warn("Supabase fetch error for diff comparison:", err);
  }

  if (!existingBill) {
    try {
      const localBackup = getLocalBackup();
      if (localBackup[mobile] && Array.isArray(localBackup[mobile].bills)) {
        currentBillsList = localBackup[mobile].bills;
        existingBill = currentBillsList.find(
          (b) => b.billNo === originalBillNo,
        );
      }
    } catch (e) {
      console.warn("Local backup read error:", e);
    }
  }

  // 2. Compute field changes
  const fieldChanges = computeBillDiff(existingBill, updatedBillData);

  // 3. Create Activity Log Entry if there are actual changes
  const existingHistory = existingBill?.editHistory || [];
  let updatedEditHistory = [...existingHistory];

  if (fieldChanges.length > 0) {
    const activityEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      formattedDateTime: new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
      changesCount: fieldChanges.length,
      changes: fieldChanges,
    };
    updatedEditHistory.unshift(activityEntry);
  }

  const updatedRecord = {
    ...updatedBillData,
    billNo: originalBillNo, // preserves original unique bill number
    customerName,
    customerMobile: mobile,
    customerAddress,
    updatedAt: new Date().toISOString(),
    editHistory: updatedEditHistory,
  };

  // 4. Update in local storage backup
  try {
    const existingBackup = getLocalBackup();
    if (!existingBackup[mobile]) {
      existingBackup[mobile] = {
        mobile_number: mobile,
        customer_name: customerName,
        customer_address: customerAddress,
        bills: [],
      };
    }
    const currentLocalBills = Array.isArray(existingBackup[mobile].bills)
      ? existingBackup[mobile].bills
      : [];
    existingBackup[mobile].bills = currentLocalBills.map((b) =>
      b.billNo === originalBillNo ? updatedRecord : b,
    );
    if (
      !existingBackup[mobile].bills.some((b) => b.billNo === originalBillNo)
    ) {
      existingBackup[mobile].bills.unshift(updatedRecord);
    }
    if (customerName) existingBackup[mobile].customer_name = customerName;
    if (customerAddress)
      existingBackup[mobile].customer_address = customerAddress;
    saveLocalBackup(existingBackup);
  } catch (err) {
    console.warn("LocalStorage update warning:", err);
  }

  // 5. Update inside Supabase customer_bills table
  try {
    const modifiedBills = currentBillsList.map((b) =>
      b.billNo === originalBillNo ? updatedRecord : b,
    );
    if (!modifiedBills.some((b) => b.billNo === originalBillNo)) {
      modifiedBills.unshift(updatedRecord);
    }

    const { data, error: updateError } = await supabase
      .from("customer_bills")
      .update({
        customer_name: customerName,
        customer_address: customerAddress || customerRow?.customer_address,
        bills: modifiedBills,
        updated_at: new Date().toISOString(),
      })
      .eq("mobile_number", mobile)
      .select()
      .single();

    if (updateError) throw updateError;
    return { data, bill: updatedRecord, status: "updated_successfully" };
  } catch (err) {
    console.error("Error updating bill in database:", err);
    return {
      bill: updatedRecord,
      status: "saved_locally_only",
      error: err.message,
    };
  }
}
