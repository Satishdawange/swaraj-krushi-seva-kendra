import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  clearDashboardMetricsCache,
  getDashboardMetrics,
  getDashboardMetricsCache,
  setDashboardMetricsCache
} from '../service/googleSheetsService';
import { cleanMobileNumber } from '../service/billingService';
import { useAuth } from '../context/AuthContext';
import { buildDashboardAnalytics } from '../utils/dashboardAnalytics';
import '../CSS/dashboard.css';

const formatMoney = (amount) => `₹ ${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const readField = (record, ...keys) => {
  for (const key of keys) if (record?.[key] !== undefined && record[key] !== '') return record[key];
  return '';
};

function challanStatus(challan) {
  const status = String(readField(challan, 'status', 'Status', 'deliveryStatus', 'Delivery_Status') || '').toLowerCase();
  if (/deliver|complete|received|पूर्ण|पोहोच/.test(status)) return 'delivered';
  if (/cancel|रद्द/.test(status)) return 'cancelled';
  return 'pending';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [period, setPeriod] = useState('month');
  const [fromMonth, setFromMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [toMonth, setToMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [trendPeriod, setTrendPeriod] = useState('week');
  const [categoryLimit, setCategoryLimit] = useState('5');
  const [billSearch, setBillSearch] = useState('');
  const [billStatus, setBillStatus] = useState('all');
  const [billLimit, setBillLimit] = useState('5');
  const [dueSearch, setDueSearch] = useState('');
  const [minimumDue, setMinimumDue] = useState('0');
  const [dueSort, setDueSort] = useState('high');
  const [dueLimit, setDueLimit] = useState('10');
  const [challanFilter, setChallanFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  const refreshMetrics = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    setRefreshError('');
    try {
      const freshMetrics = await getDashboardMetrics();
      setMetrics(freshMetrics);
      setSavedAt(new Date().toISOString());
      try {
        setDashboardMetricsCache(user.id, freshMetrics);
      } catch (cacheError) {
        console.error('Dashboard cache could not be saved:', cacheError);
        setRefreshError('ताजा डेटा लोड झाला, पण डॅशबोर्ड कॅश साठवता आला नाही.');
      }
    } catch (error) {
      console.error('Dashboard refresh failed:', error);
      setRefreshError(error.message || 'डॅशबोर्ड डेटा अद्ययावत करता आला नाही.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const cached = getDashboardMetricsCache(user?.id);
    if (cached) {
      setMetrics(cached.metrics);
      setSavedAt(cached.savedAt);
      setLoading(false);
    } else {
      setMetrics(null);
      setLoading(true);
    }
    refreshMetrics();
  }, [user?.id, refreshMetrics]);

  const dashboardMetrics = metrics || {};
  const {
    totalChallans = 0,
    totalInventoryProducts = 0,
    totalStockValuation = 0,
    lowStockCount = 0,
    lowStockItems = [],
    pendingKhata = [],
    totalCustomers = 0,
    bills = [],
    challans = [],
    categories = []
  } = dashboardMetrics;

  const analytics = useMemo(() => buildDashboardAnalytics({
    metrics: dashboardMetrics,
    period,
    fromMonth,
    toMonth,
    categoryFilter
  }), [dashboardMetrics, period, fromMonth, toMonth, categoryFilter]);
  const trendAnalytics = useMemo(() => buildDashboardAnalytics({
    metrics: dashboardMetrics,
    period: trendPeriod,
    categoryFilter
  }), [dashboardMetrics, trendPeriod, categoryFilter]);

  const { filteredBills, selectedTotals } = analytics;
  const totalBills = filteredBills.length;
  const averageBill = totalBills ? selectedTotals.sales / totalBills : 0;
  const paidPercent = selectedTotals.sales > 0
    ? Math.min(100, Math.round(selectedTotals.paid / selectedTotals.sales * 100))
    : 0;
  const creditPercent = selectedTotals.sales > 0 ? 100 - paidPercent : 0;
  const visibleCategories = analytics.categoryData.slice(0, Number(categoryLimit));

  const recentBills = useMemo(() => filteredBills
    .filter((bill) => {
      const matchesText = `${bill.billNo} ${bill.customerName}`.toLowerCase().includes(billSearch.trim().toLowerCase());
      const isDue = Number(bill._filteredDue) > 0;
      return matchesText && (billStatus === 'all' || (billStatus === 'due' ? isDue : !isDue));
    })
    .sort((a, b) => new Date(b.billDate) - new Date(a.billDate))
    .slice(0, Number(billLimit)), [filteredBills, billSearch, billStatus, billLimit]);

  const visibleDues = useMemo(() => pendingKhata
    .filter((customer) => Number(customer.balanceUdhaari) >= Number(minimumDue || 0))
    .filter((customer) => `${customer.customerName} ${customer.mobile}`.toLowerCase().includes(dueSearch.trim().toLowerCase()))
    .sort((a, b) => dueSort === 'high'
      ? Number(b.balanceUdhaari) - Number(a.balanceUdhaari)
      : Number(a.balanceUdhaari) - Number(b.balanceUdhaari))
    .slice(0, Number(dueLimit)), [pendingKhata, minimumDue, dueSearch, dueSort, dueLimit]);

  const visibleChallans = useMemo(() => challans
    .filter((challan) => challanFilter === 'all' || challanStatus(challan) === challanFilter)
    .slice(0, 6), [challans, challanFilter]);

  const visibleLowStock = useMemo(() => lowStockItems
    .filter((item) => stockFilter !== 'critical' || Number(item.availableStock) <= Math.min(Number(item.minAlertQty || 10), 5))
    .slice(0, 6), [lowStockItems, stockFilter]);

  const handleClearCache = () => {
    clearDashboardMetricsCache(user?.id);
    setSavedAt('');
  };

  if (loading && !metrics) {
    return <div className="dashboard-loading" role="status">डॅशबोर्ड डेटा लोड होत आहे…</div>;
  }

  if (!metrics) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-empty">
          <span className="dashboard-empty-icon" aria-hidden="true">!</span>
          <h1>डॅशबोर्ड डेटा मिळाला नाही</h1>
          <p>{refreshError || 'डेटा लोड करण्यासाठी पुन्हा प्रयत्न करा.'}</p>
          <button type="button" className="dashboard-button is-primary" onClick={refreshMetrics} disabled={refreshing}>
            {refreshing ? 'लोड होत आहे…' : 'पुन्हा प्रयत्न करा'}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">व्यवस्थापक नियंत्रण कक्ष</span>
          <h1>व्यवसायाचा आजचा आढावा</h1>
          <p>विक्री, उधारी, साठा आणि वितरण — एका ठिकाणी.</p>
        </div>
        <div className="dashboard-header-actions">
          <Link className="dashboard-button is-light" to="/admin/billing">＋ नवीन बिल</Link>
          <button type="button" className="dashboard-button is-primary" onClick={refreshMetrics} disabled={refreshing}>
            <span className={refreshing ? 'dashboard-refresh-icon is-spinning' : 'dashboard-refresh-icon'} aria-hidden="true">↻</span>
            {refreshing ? 'अपडेट होत आहे…' : 'आता अपडेट करा'}
          </button>
        </div>
        <div className="dashboard-data-state" role="status">
          <span className={`dashboard-state-dot${refreshing ? ' is-syncing' : ''}`} />
          {refreshing ? 'डेटा अद्ययावत होत आहे' : savedAt ? `शेवटचा अपडेट: ${new Date(savedAt).toLocaleString('mr-IN')}` : 'नवीन डेटा'}
          {savedAt && <button type="button" onClick={handleClearCache} title="या डिव्हाइसवरील डॅशबोर्ड कॅशे काढा">कॅशे काढा</button>}
        </div>
      </header>

      {refreshError && (
        <div className="dashboard-alert" role="alert">
          <span>{refreshError}</span>
          <button type="button" onClick={refreshMetrics} disabled={refreshing}>पुन्हा प्रयत्न</button>
        </div>
      )}

      <section className="dashboard-filters" aria-label="डॅशबोर्डचे सर्वसाधारण फिल्टर">
        <div>
          <span className="dashboard-section-kicker">फिल्टर</span>
          <strong>दाखवायचा कालावधी आणि श्रेणी निवडा</strong>
        </div>
        <label>कालावधी
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="day">आज</option>
            <option value="week">मागील ७ दिवस</option>
            <option value="month">हा महिना</option>
            <option value="year">हे वर्ष</option>
            <option value="custom">महिन्यांची तारीख</option>
          </select>
        </label>
        {period === 'custom' && <>
          <label>पासून <input type="month" value={fromMonth} max={toMonth} onChange={(event) => setFromMonth(event.target.value)} /></label>
          <label>पर्यंत <input type="month" value={toMonth} min={fromMonth} onChange={(event) => setToMonth(event.target.value)} /></label>
        </>}
        <label>उत्पादन श्रेणी
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">सर्व श्रेणी</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <span className="dashboard-filter-note">{totalBills} बिले या निवडीशी जुळतात</span>
      </section>

      <section className="dashboard-kpis" aria-label="मुख्य व्यवसाय आकडेवारी">
        <article className="dashboard-kpi is-green">
          <span className="dashboard-kpi-icon">₹</span><span className="dashboard-kpi-label">विक्री</span>
          <strong>{formatMoney(selectedTotals.sales)}</strong><small>{totalBills} बिलांचा एकूण</small>
        </article>
        <article className="dashboard-kpi is-blue">
          <span className="dashboard-kpi-icon">▤</span><span className="dashboard-kpi-label">बिले</span>
          <strong>{totalBills}</strong><small>सरासरी बिल {formatMoney(averageBill)}</small>
        </article>
        <article className="dashboard-kpi is-teal">
          <span className="dashboard-kpi-icon">✓</span><span className="dashboard-kpi-label">जमा रक्कम</span>
          <strong>{formatMoney(selectedTotals.paid)}</strong><small>विक्रीपैकी {paidPercent}% जमा</small>
        </article>
        <article className="dashboard-kpi is-red">
          <span className="dashboard-kpi-icon">◷</span><span className="dashboard-kpi-label">बाकी उधारी</span>
          <strong>{formatMoney(selectedTotals.due)}</strong><small>{pendingKhata.length} ग्राहकांची बाकी</small>
        </article>
        <article className="dashboard-kpi is-orange">
          <span className="dashboard-kpi-icon">▦</span><span className="dashboard-kpi-label">कमी साठा</span>
          <strong>{lowStockCount} उत्पादने</strong><small>{totalInventoryProducts} उत्पादनांपैकी</small>
        </article>
        <article className="dashboard-kpi is-orange">
          <span className="dashboard-kpi-icon">◈</span><span className="dashboard-kpi-label">साठा मूल्य</span>
          <strong>{formatMoney(totalStockValuation)}</strong><small>{totalInventoryProducts} उत्पादनांचा साठा</small>
        </article>
        <article className="dashboard-kpi is-purple">
          <span className="dashboard-kpi-icon">♧</span><span className="dashboard-kpi-label">ग्राहक आणि चालने</span>
          <strong>{totalCustomers} ग्राहक</strong><small>{totalChallans} एकूण चालने</small>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-charts">
        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><span className="dashboard-section-kicker">विक्री विश्लेषण</span><h2>विक्रीचा कल</h2></div>
            <label className="dashboard-compact-filter" aria-label="विक्री कल कालावधी">
              <select value={trendPeriod} onChange={(event) => setTrendPeriod(event.target.value)}>
                <option value="week">७ दिवस</option><option value="month">हा महिना</option><option value="year">हे वर्ष</option>
              </select>
            </label>
          </div>
          <div className="dashboard-chart" aria-label="निवडलेल्या कालावधीतील विक्री">
            {trendAnalytics.chartData.map((point) => {
              const max = Math.max(1, ...trendAnalytics.chartData.map((item) => item.value));
              const height = Math.max(4, point.value / max * 100);
              return <div className="dashboard-chart-column" key={point.label} title={`${point.label}: ${formatMoney(point.value)}`}>
                <strong>{point.value ? formatMoney(point.value) : ''}</strong>
                <span className="dashboard-chart-bar" style={{ height: `${height}%` }} />
                <small>{trendPeriod === 'year' ? point.label.slice(2) : point.label.slice(-2)}</small>
              </div>;
            })}
            {!trendAnalytics.chartData.length && <p className="dashboard-muted">या काळात विक्री नाही.</p>}
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><span className="dashboard-section-kicker">उत्पादन विश्लेषण</span><h2>श्रेणीनुसार विक्री</h2></div>
            <label className="dashboard-compact-filter" aria-label="दाखवायच्या श्रेणी">
              <select value={categoryLimit} onChange={(event) => setCategoryLimit(event.target.value)}>
                <option value="5">शीर्ष ५</option><option value="8">शीर्ष ८</option>
              </select>
            </label>
          </div>
          <div className="dashboard-category-list">
            {visibleCategories.map(([name, amount]) => {
              const max = Math.max(1, ...analytics.categoryData.map((item) => item[1]));
              return <div className="dashboard-category-row" key={name}>
                <div><span>{name}</span><strong>{formatMoney(amount)}</strong></div>
                <div className="dashboard-progress-track"><span style={{ width: `${Math.max(2, amount / max * 100)}%` }} /></div>
              </div>;
            })}
            {!visibleCategories.length && <p className="dashboard-muted">या निवडीत श्रेणीवार विक्री उपलब्ध नाही.</p>}
          </div>
        </article>
      </section>

      <section className="dashboard-card dashboard-collection-card">
        <div className="dashboard-card-heading">
          <div><span className="dashboard-section-kicker">वसुलीचा आढावा</span><h2>जमा रक्कम वि. उधारी</h2></div>
          <span className="dashboard-filter-note">निवडलेल्या कालावधीनुसार</span>
        </div>
        <div className="dashboard-collection-bar" role="img" aria-label={`विक्रीपैकी ${paidPercent}% जमा आणि ${creditPercent}% उधारी`}>
          <span style={{ width: `${paidPercent}%` }} />
          <span style={{ width: `${creditPercent}%` }} />
        </div>
        <div className="dashboard-collection-labels">
          <span><i className="is-paid" /> जमा <strong>{formatMoney(selectedTotals.paid)}</strong> ({paidPercent}%)</span>
        <span><i className="is-due" /> उधारी <strong>{formatMoney(selectedTotals.due)}</strong> ({creditPercent}%)</span>
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid-lists">
        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><span className="dashboard-section-kicker">व्यवहार</span><h2>अलीकडील बिले</h2></div>
            <Link to="/admin/bills">सर्व बिले →</Link>
          </div>
          <div className="dashboard-widget-filters">
            <input type="search" value={billSearch} onChange={(event) => setBillSearch(event.target.value)} placeholder="बिल क्रमांक / ग्राहक" aria-label="बिले शोधा" />
            <select value={billStatus} onChange={(event) => setBillStatus(event.target.value)} aria-label="बिलाची स्थिती">
              <option value="all">सर्व स्थिती</option><option value="due">बाकी असलेली</option><option value="paid">पूर्ण भरलेली</option>
            </select>
            <select value={billLimit} onChange={(event) => setBillLimit(event.target.value)} aria-label="दाखवायची बिले">
              <option value="5">५ बिले</option><option value="10">१० बिले</option>
            </select>
          </div>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead><tr><th>बिल</th><th>ग्राहक</th><th>दिनांक</th><th>एकूण</th><th>बाकी</th></tr></thead>
              <tbody>
                {recentBills.map((bill) => <tr key={bill.billNo || bill.id}>
                  <td><strong>{bill.billNo || '—'}</strong></td>
                  <td>{bill.customerName || 'ग्राहक'}</td>
                  <td>{new Date(bill.billDate).toLocaleDateString('mr-IN')}</td>
                  <td>{formatMoney(bill._filteredTotal)}</td>
                  <td className={bill._filteredDue > 0 ? 'is-due' : 'is-paid'}>{formatMoney(bill._filteredDue)}</td>
                </tr>)}
                {!recentBills.length && <tr><td colSpan="5" className="dashboard-empty-cell">या फिल्टरशी जुळणारी बिले नाहीत.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><span className="dashboard-section-kicker">साठा नियंत्रण</span><h2>कमी साठा सूचना</h2></div>
            <Link to="/admin/inventory">साठा पहा →</Link>
          </div>
          <div className="dashboard-widget-filters">
            <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="साठा फिल्टर">
              <option value="all">सर्व कमी साठा</option><option value="critical">अत्यंत कमी (≤५)</option>
            </select>
            <span className="dashboard-filter-note">{visibleLowStock.length} दाखवत आहे</span>
          </div>
          <div className="dashboard-simple-list">
            {visibleLowStock.map((item) => <div className="dashboard-simple-row" key={item.id || item.name}>
              <span><strong>{item.name || 'उत्पादन'}</strong><small>{item.category || 'इतर'}</small></span>
              <span className="dashboard-stock-value">{Number(item.availableStock || 0)} शिल्लक</span>
            </div>)}
            {!visibleLowStock.length && <p className="dashboard-muted">या फिल्टरमध्ये कमी साठा उत्पादने नाहीत.</p>}
          </div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-lists">
        <article className="dashboard-card dashboard-dues-card">
          <div className="dashboard-card-heading">
            <div><span className="dashboard-section-kicker">ग्राहक खाती</span><h2>उधारी आणि वसुली</h2></div>
            <strong className="dashboard-due-total">{formatMoney(selectedTotals.due)}</strong>
          </div>
          <div className="dashboard-widget-filters">
            <input type="search" value={dueSearch} onChange={(event) => setDueSearch(event.target.value)} placeholder="नाव / मोबाईल शोधा" aria-label="उधारी ग्राहक शोधा" />
            <select value={minimumDue} onChange={(event) => setMinimumDue(event.target.value)} aria-label="किमान उधारी">
              <option value="0">सर्व रक्कम</option><option value="1000">₹१,००० पेक्षा जास्त</option><option value="5000">₹५,००० पेक्षा जास्त</option>
            </select>
            <select value={dueSort} onChange={(event) => setDueSort(event.target.value)} aria-label="उधारी क्रम">
              <option value="high">मोठी बाकी आधी</option><option value="low">लहान बाकी आधी</option>
            </select>
            <select value={dueLimit} onChange={(event) => setDueLimit(event.target.value)} aria-label="दाखवायचे ग्राहक">
              <option value="10">१० ग्राहक</option><option value="25">२५ ग्राहक</option>
            </select>
          </div>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead><tr><th>ग्राहक</th><th>मोबाईल</th><th>खरेदी</th><th>बाकी</th><th>स्मरणपत्र</th></tr></thead>
              <tbody>
                {visibleDues.map((customer) => {
                  const mobile = cleanMobileNumber(customer.mobile);
                  const due = Number(customer.balanceUdhaari || 0);
                  const message = `नमस्कार ${customer.customerName} जी, स्वराज कृषी सेवा केंद्र येथील आपल्या खात्यावर ${formatMoney(due)} बाकी आहे. कृपया सोयीनुसार जमा करावी. धन्यवाद!`;
                  return <tr key={customer.id || customer.mobile || customer.customerName}>
                    <td><strong>{customer.customerName || 'ग्राहक'}</strong></td>
                    <td>{customer.mobile || '—'}</td>
                    <td>{formatMoney(customer.totalPurchased)}</td>
                    <td className="is-due">{formatMoney(due)}</td>
                    <td>{mobile && <a className="dashboard-whatsapp" href={`https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">WhatsApp</a>}</td>
                  </tr>;
                })}
                {!visibleDues.length && <tr><td colSpan="5" className="dashboard-empty-cell">या फिल्टरमध्ये उधारी ग्राहक नाहीत.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><span className="dashboard-section-kicker">वितरण</span><h2>चालने</h2></div>
            <Link to="/admin/challans">सर्व चालने →</Link>
          </div>
          <div className="dashboard-widget-filters">
            <select value={challanFilter} onChange={(event) => setChallanFilter(event.target.value)} aria-label="चालन स्थिती">
              <option value="all">सर्व चालने ({totalChallans})</option>
              <option value="pending">प्रलंबित</option><option value="delivered">पोहोचवले</option><option value="cancelled">रद्द</option>
            </select>
          </div>
          <div className="dashboard-simple-list">
            {visibleChallans.map((challan, index) => {
              const status = challanStatus(challan);
              const statusLabel = status === 'delivered' ? 'पोहोचवले' : status === 'cancelled' ? 'रद्द' : 'प्रलंबित';
              return <div className="dashboard-simple-row" key={challan.id || challan.challanNo || challan.Challan_No || index}>
                <span><strong>{readField(challan, 'challanNo', 'Challan_No', 'challan_no') || `चालन ${index + 1}`}</strong><small>{readField(challan, 'customerName', 'Customer_Name', 'customer_name') || 'ग्राहक'}</small></span>
                <span className={`dashboard-status-pill is-${status}`}>{statusLabel}</span>
              </div>;
            })}
            {!visibleChallans.length && <p className="dashboard-muted">या स्थितीची चालने नाहीत.</p>}
          </div>
        </article>
      </section>

      <nav className="dashboard-quick-links" aria-label="जलद कृती">
        <Link to="/admin/billing"><span>＋</span><strong>नवीन बिल</strong><small>विक्री नोंदवा</small></Link>
        <Link to="/admin/challan/create"><span>↗</span><strong>नवीन चालन</strong><small>वितरण नोंदवा</small></Link>
        <Link to="/admin/inventory"><span>▦</span><strong>इन्व्हेंटरी</strong><small>साठा व्यवस्थापन</small></Link>
        <Link to="/admin/sheets"><span>☷</span><strong>डेटा सेटिंग्ज</strong><small>Google Sheets जोडणी</small></Link>
      </nav>
    </div>
  );
}
