import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyCustomerBills, getLiveInventoryItems } from '../service/googleSheetsService';
import { normalizeBillRow, normalizeInventoryRow } from '../utils/sheetData';
import '../CSS/customerPortal.css';

const digits = (value) => String(value || '').replace(/\D/g, '').slice(-10);
const FALLBACK_IMAGE = '/images/sksk-icon-512.png';

export default function CustomerPortal() {
  const { user, signOut } = useAuth();
  const [bills, setBills] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('bills');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userMobile = digits(user?.mobile || user?.username || String(user?.id || '').replace(/^CUST-/i, ''));

  useEffect(() => {
    let active = true;
    async function loadAccountData() {
      setLoading(true);
      setError('');
      try {
        const [billRows, inventoryRows] = await Promise.all([
          fetchMyCustomerBills(),
          getLiveInventoryItems()
        ]);
        if (!active) return;
        const ownBills = billRows.map(normalizeBillRow).filter((bill) => digits(bill.customerMobile) === userMobile);
        setBills(ownBills);
        setInventory(inventoryRows.map(normalizeInventoryRow));
      } catch (loadError) {
        if (active) setError(loadError.message || 'खाते माहिती लोड करता आली नाही.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAccountData();
    return () => { active = false; };
  }, [user?.id, userMobile]);

  const purchasedProducts = useMemo(() => {
    const products = new Map();
    bills.forEach((bill) => {
      bill.items.forEach((billItem) => {
        const itemName = String(billItem.name || billItem.nameEn || '').trim();
        const inventoryItem = inventory.find((entry) => {
          const idMatch = [billItem.inventoryId, billItem.productId].filter(Boolean)
            .some((id) => String(entry.id) === String(id) || String(entry.Product_ID || '') === String(id));
          const nameMatch = [entry.name, entry.nameEn].filter(Boolean)
            .some((name) => name.trim().toLowerCase() === itemName.toLowerCase());
          return idMatch || nameMatch;
        });
        const key = String(inventoryItem?.id || itemName).toLowerCase();
        if (!key) return;
        const existing = products.get(key) || {
          id: inventoryItem?.id || key,
          name: inventoryItem?.name || billItem.name || billItem.nameEn,
          nameEn: inventoryItem?.nameEn || billItem.nameEn || '',
          category: inventoryItem?.category || billItem.category || '',
          company: inventoryItem?.company || '',
          image: inventoryItem?.image || FALLBACK_IMAGE,
          pack: inventoryItem?.pack || billItem.unit || '',
          usage: inventoryItem?.usage || '',
          crops: inventoryItem?.crops || '',
          quantity: 0,
          unit: billItem.unit || inventoryItem?.unit || 'नग',
          lastPurchased: bill.billDate || ''
        };
        existing.quantity += Number(billItem.qty || 0);
        if (String(bill.billDate || '') > String(existing.lastPurchased || '')) existing.lastPurchased = bill.billDate;
        products.set(key, existing);
      });
    });
    return [...products.values()].sort((a, b) => String(b.lastPurchased).localeCompare(String(a.lastPurchased)));
  }, [bills, inventory]);

  return (
    <section className="customer-account-page">
      <header className="customer-account-header">
        <div>
          <span className="customer-account-kicker">ग्राहक खाते</span>
          <h1>{user?.fullName || 'शेतकरी बांधव'}</h1>
          <p>मोबाईल: {userMobile || 'उपलब्ध नाही'}</p>
        </div>
        <div className="customer-account-actions">
          <Link to="/account/password" className="customer-account-secondary">पासवर्ड बदला</Link>
          <button type="button" onClick={signOut}>लॉगआउट</button>
        </div>
      </header>

      <nav className="customer-account-tabs" aria-label="ग्राहक खाते माहिती">
        <button type="button" className={activeTab === 'bills' ? 'active' : ''} onClick={() => setActiveTab('bills')}>माझी बिले <span>{bills.length}</span></button>
        <button type="button" className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>खरेदी उत्पादने <span>{purchasedProducts.length}</span></button>
      </nav>

      {error && <div className="customer-account-message" role="alert">{error}</div>}
      {loading ? (
        <div className="customer-account-empty" role="status">खात्याची माहिती लोड होत आहे…</div>
      ) : activeTab === 'bills' ? (
        bills.length === 0 ? (
          <div className="customer-account-empty">या मोबाईल क्रमांकाशी संबंधित बिले सापडली नाहीत.</div>
        ) : (
          <div className="customer-account-table-wrap">
            <table className="customer-account-table">
              <thead><tr><th>बिल क्रमांक</th><th>तारीख</th><th>खरेदी केलेली उत्पादने</th></tr></thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.billNo}>
                    <td><strong>{bill.billNo}</strong>{bill.billBookBillNo && <small>बुक: {bill.billBookBillNo}</small>}</td>
                    <td>{bill.billDate || '—'}</td>
                    <td>{bill.items.map((item) => `${item.name || item.nameEn} (${item.qty} ${item.unit || 'नग'})`).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : purchasedProducts.length === 0 ? (
        <div className="customer-account-empty">खरेदी केलेली उत्पादने सापडली नाहीत.</div>
      ) : (
        <div className="customer-purchased-products">
          {purchasedProducts.map((product) => (
            <article className="customer-purchased-product" key={product.id}>
              <img src={product.image || FALLBACK_IMAGE} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = FALLBACK_IMAGE; }} />
              <div className="customer-purchased-product-info">
                <strong>{product.name}</strong>
                {product.nameEn && product.nameEn !== product.name && <span>{product.nameEn}</span>}
                <small>{[product.category, product.company, product.crops, product.usage].filter(Boolean).join(' · ')}</small>
              </div>
              <div className="customer-purchased-quantity"><strong>{product.quantity} {product.unit}</strong><small>एकूण खरेदी प्रमाण</small></div>
              <time>{product.lastPurchased || '—'}</time>
            </article>
          ))}
        </div>
      )}

    </section>
  );
}