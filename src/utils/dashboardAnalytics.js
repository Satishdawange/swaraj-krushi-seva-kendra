export function buildDashboardAnalytics({ metrics = {}, period = "month", fromMonth = "", toMonth = "", categoryFilter = "all", now = new Date() }) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  let start = new Date(today);
  let end = new Date(today);
  if (period === "week") start.setDate(today.getDate() - 6);
  else if (period === "month") start = new Date(today.getFullYear(), today.getMonth(), 1);
  else if (period === "year") start = new Date(today.getFullYear(), 0, 1);
  else if (period === "custom") {
    const [fy, fm] = fromMonth.split("-").map(Number);
    const [ty, tm] = toMonth.split("-").map(Number);
    start = new Date(fy || today.getFullYear(), (fm || 1) - 1, 1);
    end = new Date(ty || today.getFullYear(), tm || today.getMonth() + 1, 0);
  }
  end.setHours(23, 59, 59, 999);

  const inventory = metrics.inventory || [];
  const categoryForItem = (line) => {
    if (line.category || line.Category) return line.category || line.Category;
    const refs = [line.productId, line.product_id, line.productName, line.name, line.id].filter(Boolean).map((ref) => String(ref).trim().toLowerCase());
    return inventory.find((item) => refs.includes(String(item.id || "").trim().toLowerCase()) || refs.includes(String(item.name || "").trim().toLowerCase()) || refs.includes(String(item.nameEn || item.name_en || "").trim().toLowerCase()))?.category || "इतर";
  };
  const lineAmount = (line) => Number(line.totalAmount || line.total || line.lineTotal || line.amount || (Number(line.quantity || line.qty || 0) * Number(line.price || line.sellingPrice || line.rate || 0)) || 0);
  const byCategory = {};
  const eligible = (metrics.bills || []).filter((bill) => {
    const date = new Date(bill.billDate);
    if (Number.isNaN(date.getTime()) || date < start || date > end) return false;
    return categoryFilter === "all" || (bill.items || []).some((line) => categoryForItem(line) === categoryFilter);
  });
  const filteredBills = eligible.map((bill) => {
    const lines = (bill.items || []).map((line) => ({ ...line, _category: categoryForItem(line), _amount: lineAmount(line) }));
    lines.forEach((line) => { byCategory[line._category] = (byCategory[line._category] || 0) + line._amount; });
    const matching = categoryFilter === "all" ? lines : lines.filter((line) => line._category === categoryFilter);
    const amount = categoryFilter === "all" || !lines.length ? Number(bill.totalAmount || 0) : matching.reduce((sum, line) => sum + line._amount, 0);
    const ratio = bill.totalAmount ? amount / Number(bill.totalAmount) : 0;
    return { ...bill, _filteredTotal: amount, _filteredPaid: Number(bill.paidAmount || 0) * ratio, _filteredDue: Number(bill.balanceAmount || 0) * ratio };
  });
  const selectedTotals = filteredBills.reduce((out, bill) => ({
    sales: out.sales + bill._filteredTotal,
    paid: out.paid + bill._filteredPaid,
    due: out.due + bill._filteredDue,
  }), { sales: 0, paid: 0, due: 0 });

  const bins = new Map();
  const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (period === "year" || period === "custom") {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const cap = Math.min(24, Math.max(1, (end.getFullYear() - cursor.getFullYear()) * 12 + end.getMonth() - cursor.getMonth() + 1));
    for (let i = 0; i < cap; i++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth() + i, 1);
      bins.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
    }
    filteredBills.forEach((bill) => {
      const d = new Date(bill.billDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (bins.has(key)) bins.set(key, bins.get(key) + bill._filteredTotal);
    });
  } else if (period === "day") {
    bins.set(localDateKey(today), 0);
    filteredBills.forEach((bill) => {
      const key = localDateKey(new Date(bill.billDate));
      if (bins.has(key)) bins.set(key, bins.get(key) + bill._filteredTotal);
    });
  } else {
    const count = Math.min(31, Math.max(1, Math.ceil((end - start) / 86400000) + 1));
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      bins.set(localDateKey(d), 0);
    }
    filteredBills.forEach((bill) => {
      const key = localDateKey(new Date(bill.billDate));
      if (bins.has(key)) bins.set(key, bins.get(key) + bill._filteredTotal);
    });
  }
  return {
    filteredBills,
    chartData: [...bins].map(([label, value]) => ({ label, value })),
    categoryData: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8),
    selectedTotals,
  };
}
