const DASHBOARD_CACHE_PREFIX = "sksk_dashboard_metrics:";

export function getDashboardMetricsCache(userId) {
  if (!userId) return null;
  const cacheKey = `${DASHBOARD_CACHE_PREFIX}${encodeURIComponent(userId)}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (!parsed?.metrics || !parsed?.savedAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Dashboard cache could not be read:", error);
    try {
      localStorage.removeItem(cacheKey);
    } catch (cleanupError) {
      console.warn("Invalid dashboard cache could not be removed:", cleanupError);
    }
    return null;
  }
}

export function setDashboardMetricsCache(userId, metrics) {
  if (!userId || !metrics) return;
  localStorage.setItem(`${DASHBOARD_CACHE_PREFIX}${encodeURIComponent(userId)}`, JSON.stringify({
    metrics,
    savedAt: new Date().toISOString(),
  }));
}

export function clearDashboardMetricsCache(userId) {
  if (!userId) return;
  localStorage.removeItem(`${DASHBOARD_CACHE_PREFIX}${encodeURIComponent(userId)}`);
}
