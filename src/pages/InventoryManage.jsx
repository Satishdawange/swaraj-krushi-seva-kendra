import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchGoogleSheetRecords, getAllInventoryItems, getLiveInventoryItems, saveInventoryItem } from '../service/googleSheetsService';
import { normalizeInventoryRow } from '../utils/sheetData';
import '../CSS/inventoryManagement.css';

const FALLBACK_IMAGE = '/images/sksk-icon-512.png';
const DEFAULT_HEADERS = [
  'ID', 'Name', 'Category', 'Subcategory', 'Company', 'Unit', 'Pack',
  'Purchase_Price', 'Selling_Price', 'Available_Stock', 'Min_Alert_Qty',
  'Updated_At', 'Product_ID', 'Name_EN', 'Category_EN', 'Company_EN',
  'Badge_MR', 'Image_URL', 'Short_MR', 'Description_MR', 'Usage_MR',
  'Crops_MR', 'Is_Active'
];
const NORMALIZED_ONLY_KEYS = new Set([
  'id', 'name', 'nameEn', 'category', 'categoryEn', 'subcategory', 'company',
  'companyEn', 'unit', 'pack', 'purchasePrice', 'sellingPrice', 'availableStock',
  'minAlertQty', 'badge', 'image', 'short', 'description', 'usage', 'crops',
  'isActive', 'updatedAt'
]);
const normalizeKey = (key) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const labelFor = (key) => ({
  id: 'ID (read-only)', name: 'उत्पादनाचे नाव (मराठी)', nameen: 'Product name (English)',
  category: 'श्रेणी (मराठी)', categoryen: 'Category (English)', company: 'कंपनीचे नाव (मराठी)',
  companyen: 'Company name (English)', subcategory: 'उपश्रेणी', unit: 'युनिट', pack: 'पॅक',
  purchaseprice: 'खरेदी किंमत', sellingprice: 'विक्री किंमत', availablestock: 'उपलब्ध साठा',
  minalertqty: 'किमान साठा सूचना', updatedat: 'शेवटचे अद्यतन', productid: 'Product ID',
  badgemr: 'बॅज', imageurl: 'प्रतिमा लिंक', shortmr: 'संक्षिप्त वर्णन',
  descriptionmr: 'वर्णन', usagemr: 'वापर', cropsmr: 'पिके', isactive: 'पोर्टलवर सक्रिय'
}[normalizeKey(key)] || String(key).replace(/_/g, ' '));
const numericFields = new Set(['purchaseprice', 'sellingprice', 'availablestock', 'minalertqty']);
const textareaFields = new Set(['descriptionmr', 'usagemr', 'cropsmr', 'shortmr']);

function pairedFields(header) {
  const key = normalizeKey(header);
  if (['name', 'namemr', 'nameen', 'productname', 'productnameen'].includes(key)) return ['name', 'nameen', 'namemr'];
  if (['category', 'categorymr', 'categoryen', 'categoryname'].includes(key)) return ['category', 'categoryen', 'categorymr'];
  if (['company', 'companymr', 'companyen'].includes(key)) return ['company', 'companyen', 'companymr'];
  return null;
}

function pickValue(record, ...keys) {
  const wanted = new Set(keys.map(normalizeKey));
  const key = Object.keys(record || {}).find((candidate) => wanted.has(normalizeKey(candidate)));
  return key ? record[key] : '';
}

export default function InventoryManage() {
  const { id: routeItemId } = useParams();
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [headers, setHeaders] = useState(DEFAULT_HEADERS);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({});
  const [lockedId, setLockedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');
  const [suggestionField, setSuggestionField] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [inventoryResult, categoriesResult] = await Promise.allSettled([
      getLiveInventoryItems({ strict: true }),
      fetchGoogleSheetRecords('Categories')
    ]);
    const inventoryRows = inventoryResult.status === 'fulfilled'
      ? inventoryResult.value
      : getAllInventoryItems();
    const categoryRows = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
    setInventory(inventoryRows);
    setCategories(categoryRows.filter((row) => String(pickValue(row, 'Is_Active', 'is_active') ?? 'true').toLowerCase() !== 'false'));
    if (inventoryRows.length) {
      const sheetHeaders = Object.keys(inventoryRows[0]).filter((key) => !NORMALIZED_ONLY_KEYS.has(key));
      setHeaders(sheetHeaders.some((key) => normalizeKey(key) === 'name') ? sheetHeaders : DEFAULT_HEADERS);
    }
    if (inventoryResult.status === 'rejected' || categoriesResult.status === 'rejected') {
      setMessageTone('error');
      setMessage('Google Sheet मधील माहिती लोड झाली नाही. जोडणी तपासा; दाखवलेली इन्व्हेंटरी कॅशमधून असू शकते.');
    }
    setLoading(false);
  };

  useEffect(() => { loadData().catch((error) => { setMessageTone('error'); setMessage(error.message); setLoading(false); }); }, []);

  const fields = useMemo(() => headers.filter((header) => normalizeKey(header) !== 'id'), [headers]);
  const filteredInventory = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return inventory;
    return inventory.filter((item) => Object.values(item).some((value) => String(value ?? '').toLowerCase().includes(term)));
  }, [inventory, search]);

  const beginNew = () => {
    const next = Object.fromEntries(headers.map((header) => [header, normalizeKey(header) === 'isactive' ? true : '']));
    setForm(next);
    setLockedId('');
    setMessage('');
    setMessageTone('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const beginEdit = (item) => {
    const id = String(item.id || item.ID || '');
    const sheetValues = Object.fromEntries(headers.map((header) => [header, pickValue(item, header)]));
    setForm({ ...item, ...sheetValues, ID: id });
    setLockedId(id);
    setMessage('');
    setMessageTone('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!routeItemId || loading) return;
    const selected = inventory.find((item) => String(item.id || item.ID) === routeItemId);
    if (!selected) return;
    const id = String(selected.id || selected.ID || '');
    const sheetValues = Object.fromEntries(headers.map((header) => [header, pickValue(selected, header)]));
    setForm({ ...selected, ...sheetValues, ID: id });
    setLockedId(id);
    setMessage('');
    setMessageTone('success');
  }, [routeItemId, inventory, loading, headers]);

  const changeField = (header, value) => {
    const pair = pairedFields(header);
    const sourceRows = normalizeKey(header).includes('category') ? categories : inventory;
    const match = pair && sourceRows.find((row) => {
      const candidate = normalizeKey(header).includes('category')
        ? [pickValue(row, 'Name_MR', 'Category_MR', 'Category', 'name'), pickValue(row, 'Name_EN', 'Category_EN', 'categoryEn')]
        : [pickValue(row, pair[0], pair[2]), pickValue(row, pair[1])];
      return candidate.some((candidateValue) => String(candidateValue).trim().toLowerCase() === value.trim().toLowerCase());
    });

    if (pair && match) {
      if (pair[0] !== 'name') {
        const isCategory = normalizeKey(header).includes('category');
        const marathiValue = isCategory
          ? pickValue(match, 'Name_MR', 'Category_MR', 'Category', 'name')
          : pickValue(match, pair[0], pair[2]);
        const englishValue = isCategory
          ? pickValue(match, 'Name_EN', 'Category_EN', 'categoryEn')
          : pickValue(match, pair[1]);
        setForm((current) => ({
          ...current,
          [headers.find((key) => normalizeKey(key) === pair[0]) || (isCategory ? 'Category' : pair[0])]: marathiValue,
          [headers.find((key) => normalizeKey(key) === pair[1]) || (isCategory ? 'Category_EN' : pair[1])]: englishValue
        }));
      } else {
        const matchedId = String(match.id || match.ID || '');
        setForm({ ...match, ID: matchedId, id: matchedId });
        if (!lockedId) setLockedId(matchedId);
      }
      return;
    }

    setForm((current) => {
      const next = { ...current, [header]: value };
      if (pair && lockedId) {
        headers.filter((field) => pair.map(normalizeKey).includes(normalizeKey(field)) && field !== header)
          .forEach((field) => { next[field] = ''; });
        if (pair[0] === 'name') {
          next.ID = '';
          next.id = '';
        }
      }
      return next;
    });
    if (pair && lockedId) setLockedId('');
  };

  const valuesFor = (header) => {
    const key = normalizeKey(header);
    const pair = pairedFields(header);
    const fromInventory = inventory.flatMap((item) => pair
      ? [pickValue(item, pair[0], pair[2]), pickValue(item, pair[1])]
      : [pickValue(item, header)])
      .filter((value) => value !== '' && value != null);
    const fromCategories = key.includes('category')
      ? categories.flatMap((row) => [pickValue(row, 'Name_MR', 'Name', 'Category_MR'), pickValue(row, 'Name_EN', 'Category_EN')]).filter(Boolean)
      : [];
    return [...new Set([...fromInventory, ...fromCategories].map(String))];
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = pickValue(form, 'Name') || pickValue(form, 'Name_MR') || pickValue(form, 'Name_EN') || pickValue(form, 'nameEn');
    if (!String(name || '').trim()) {
      setMessage('उत्पादनाचे मराठी किंवा इंग्रजी नाव आवश्यक आहे.');
      return;
    }
    setSaving(true);
    setMessage('');
    const id = lockedId || form.ID || form.id || `INV-${Date.now()}`;
    const payload = { ...form, id, ID: id, updatedAt: new Date().toISOString(), Updated_At: new Date().toISOString() };
    try {
      const result = await saveInventoryItem(payload);
      const saved = result.item;
      setInventory((current) => [saved, ...current.filter((item) => String(item.id || item.ID) !== String(id))]);
      setForm({ ...saved });
      setLockedId(String(id));
      setMessageTone(result.isLive ? 'success' : 'error');
      setMessage(result.isLive ? 'इन्व्हेंटरी Google Sheet मध्ये जतन झाली.' : 'Google Sheets URL उपलब्ध नाही; नोंद फक्त या डिव्हाइसवर जतन झाली.');
    } catch (error) {
      setMessageTone('error');
      setMessage(`Google Sheet मध्ये जतन अयशस्वी: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="inventory-manage-page">
      <header className="inventory-manage-heading">
        <div>
          <Link to="/admin/inventory" className="inventory-back-link">← इन्व्हेंटरी</Link>
          <h1>उत्पादन नोंदी</h1>
          <p>शीटमधील उत्पादन माहिती आणि पोर्टलवरील सक्रिय स्थिती व्यवस्थापित करा.</p>
        </div>
        <button type="button" className="inventory-new-button" onClick={beginNew}>＋ नवीन उत्पादन</button>
      </header>

      <form className="inventory-editor" onSubmit={handleSubmit}>
        <div className="inventory-editor-title">
          <div>
            <span>{lockedId ? 'उत्पादन संपादन' : 'नवीन उत्पादन'}</span>
            <small>{lockedId ? `ID: ${lockedId}` : 'मराठी आणि English नाव भरता येतील'}</small>
          </div>
          {lockedId && <button type="button" className="inventory-reset-button" onClick={beginNew}>＋ नवीन नोंद</button>}
        </div>
        {message && <div className={`inventory-feedback ${messageTone}`} role={messageTone === 'error' ? 'alert' : 'status'}>{message}</div>}
        <div className="inventory-fields-grid">
          {fields.map((header, index) => {
            const key = normalizeKey(header);
            const value = form[header] ?? (key === 'isactive' ? true : '');
            const listId = `inventory-values-${index}`;
            const fieldSuggestions = valuesFor(header)
              .filter((option) => String(option).toLowerCase().includes(String(value).trim().toLowerCase()))
              .slice(0, 8);
            if (key === 'isactive') {
              return <label className="inventory-active-field" key={header}>
                <input type="checkbox" checked={String(value).toLowerCase() !== 'false'} onChange={(event) => setForm((current) => ({ ...current, [header]: event.target.checked }))} />
                <span>{labelFor(header)}</span>
              </label>;
            }
            return <label className={`inventory-field ${textareaFields.has(key) ? 'inventory-field-wide' : ''}`} key={header}>
              <span>{labelFor(header)}</span>
              {textareaFields.has(key) ? (
                <div className="inventory-textarea-wrap">
                  <textarea
                    rows="3"
                    value={value}
                    onFocus={() => setSuggestionField(header)}
                    onChange={(event) => { changeField(header, event.target.value); setSuggestionField(header); }}
                    onBlur={() => window.setTimeout(() => setSuggestionField(''), 120)}
                  />
                  {suggestionField === header && fieldSuggestions.length > 0 && (
                    <div className="inventory-suggestions">
                      {fieldSuggestions.map((option) => <button type="button" key={option} onMouseDown={(event) => event.preventDefault()} onClick={() => { changeField(header, String(option)); setSuggestionField(''); }}>{option}</button>)}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type={numericFields.has(key) ? 'number' : key === 'imageurl' ? 'url' : 'text'}
                  step={numericFields.has(key) ? 'any' : undefined}
                  value={value}
                  list={listId}
                  onChange={(event) => changeField(header, event.target.value)}
                />
              )}
              <datalist id={listId}>{valuesFor(header).map((option) => <option key={option} value={option} />)}</datalist>
            </label>;
          })}
        </div>
        <div className="inventory-editor-actions">
          <button type="submit" disabled={saving}>{saving ? 'जतन होत आहे…' : 'बदल जतन करा'}</button>
        </div>
      </form>

      <div className="inventory-list-heading">
        <h2>इन्व्हेंटरी यादी <span>{filteredInventory.length}</span></h2>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="मराठी / English नाव, कंपनी किंवा श्रेणी शोधा" />
      </div>
      {loading ? <p className="inventory-empty">इन्व्हेंटरी लोड होत आहे…</p> : filteredInventory.length === 0 ? <p className="inventory-empty">नोंदी आढळल्या नाहीत.</p> : (
        <div className="inventory-record-list">
          {filteredInventory.map((item, index) => {
            const normalized = normalizeInventoryRow(item);
            return <article className="inventory-record" key={normalized.id || index}>
              <img src={normalized.image || FALLBACK_IMAGE} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = FALLBACK_IMAGE; }} />
              <div className="inventory-record-main">
                <strong>{normalized.name || normalized.nameEn || 'नाव नाही'}</strong>
                <span>{normalized.nameEn}</span>
                <small>{[normalized.category, normalized.categoryEn, normalized.company, normalized.unit].filter(Boolean).join(' · ')}</small>
              </div>
              <span className={normalized.isActive ? 'inventory-status active' : 'inventory-status'}>{normalized.isActive ? 'सक्रिय' : 'लपवलेले'}</span>
              <button type="button" onClick={() => beginEdit(item)}>संपादित करा</button>
            </article>;
          })}
        </div>
      )}
    </section>
  );
}