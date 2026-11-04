import { triggerSavePopup } from '../components/SavePopup';
import React, { useState, useEffect } from 'react';
import {
  getGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  testGoogleSheetsConnection,
  exportAllToGoogleSheet,
  syncCustomersWithSheet,
  getScriptTemplateCode,
  fetchAllSheetSettings,
  saveSheetSetting,
  fetchAllSheetCategories,
  saveSheetCategory,
  fetchAllServices,
  saveServiceItem
} from '../service/googleSheetsService';
import { DEFAULT_SERVICE_IMAGE } from '../data/consultancyServices';
import '../CSS/billing.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SENSITIVE_PATTERN = /key|password|token|secret/i;

const BADGE_MAP = {
  gemini_api_key:    { label: '🤖 AI',    bg: '#e8f0fe', color: '#1a73e8' },
  chatgpt_api_key:   { label: '🤖 AI',    bg: '#e8f0fe', color: '#1a73e8' },
  gst_number:        { label: '💰 GST',   bg: '#fce8b2', color: '#b06000' },
  shop_name:         { label: '🏪 Shop',  bg: '#e6f4ea', color: '#137333' },
  owner_name:        { label: '🏪 Shop',  bg: '#e6f4ea', color: '#137333' },
  phone:             { label: '🏪 Shop',  bg: '#e6f4ea', color: '#137333' },
  whatsapp:          { label: '🏪 Shop',  bg: '#e6f4ea', color: '#137333' },
};

function getBadge(key) {
  return BADGE_MAP[key] || { label: '⚙️ General', bg: '#f1f3f4', color: '#5f6368' };
}

const SUGGESTED_KEYS = [
  { key: 'gemini_api_key',        desc: 'Gemini AI साठी API Key',                    example: 'AQ.Ab8RN6...' },
  { key: 'chatgpt_api_key',       desc: 'ChatGPT (OpenAI) API Key',                  example: 'sk-proj-...' },
  { key: 'gst_number',            desc: 'दुकानाचा GST क्रमांक',                     example: '27AAAPX...' },
  { key: 'shop_name',             desc: 'दुकानाचे नाव',                               example: 'स्वराज कृषी...' },
  { key: 'owner_name',            desc: 'प्रोप्रायटरचे नाव',                          example: 'निलेश दवंगे' },
  { key: 'phone',                 desc: 'संपर्क फोन',                                 example: '8459568940' },
  { key: 'whatsapp',              desc: 'WhatsApp नंबर',                              example: '918459568940' },
  { key: 'show_home_delivery',    desc: 'घरपोच डिलिव्हरी दाखवायचे का (true/false)', example: 'false' },
  { key: 'show_ai_advisor',       desc: 'AI कृषी मित्र दाखवायचे का (true/false)',   example: 'true' },
  { key: 'show_product_request',  desc: 'उत्पादन मागणी फॉर्म दाखवायचे का (true/false)', example: 'true' },
  { key: 'bill_gst_percent',      desc: 'GST टक्केवारी (0 = नाही)',                  example: '0' },
  { key: 'low_stock_alert_qty',   desc: 'कमी साठा इशारा पातळी',                     example: '5' },
  { key: 'show_consultancy_services', desc: 'कन्सल्टन्सी सेवा पोर्टलवर दाखवायचे का (true/false)', example: 'true' },
];

// ─── PropertiesTab sub-component ─────────────────────────────────────────────
function PropertiesTab() {
  const [settingsRows, setSettingsRows] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [visibleKeys, setVisibleKeys] = useState({});

  const toggleVisibility = (key) =>
    setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }));

  const handleLoadSettings = async () => {
    setSettingsLoading(true);
    setSettingsError('');
    try {
      const rows = await fetchAllSheetSettings();
      setSettingsRows(rows);
      localStorage.setItem('sksk_sheet_settings_cache', JSON.stringify(rows));
      setSaveMsg(`✅ ${rows.length} सेटिंग्ज लोड झाल्या!`);
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSettingsError('सेटिंग्ज लोड करताना त्रुटी: ' + err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleStartEdit = (row) => {
    setEditingKey(row.key);
    setEditingValue(row.value);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  const handleSaveSetting = async (key) => {
    setSavingKey(key);
    try {
      await saveSheetSetting(key, editingValue);
      setSettingsRows(prev => prev.map(r => r.key === key ? { ...r, value: editingValue } : r));
      const updated = settingsRows.map(r => r.key === key ? { ...r, value: editingValue } : r);
      localStorage.setItem('sksk_sheet_settings_cache', JSON.stringify(updated));
      setEditingKey(null);
      setSaveMsg(`✅ "${key}" सेव्ह केले!`);
      triggerSavePopup({
        title: 'सेटिंग जतन झाली! ✓',
        message: `"${key}" ची मूल्य सेटिंग Google Sheet मधील Settings टॅबमध्ये सेव्ह झाली.`,
        details: [
          { label: 'सेटिंग की', value: key },
          { label: 'मूल्य (Value)', value: editingValue || '(रिकामी)' }
        ]
      });
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      alert('सेव्ह करताना त्रुटी: ' + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  const cellStyle = {
    padding: '10px 12px',
    borderBottom: '1px solid #edf2ef',
    fontSize: '13px',
    verticalAlign: 'middle'
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '20px', color: '#176b3a', fontWeight: '800' }}>
          ⚙️ App Properties &amp; API Keys (Google Sheet Settings)
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#65776d' }}>
          Google Sheet च्या <strong>Settings</strong> टॅबमधून सर्व सेटिंग्ज इथे लोड करा, संपादित करा आणि सेव्ह करा.
        </p>
      </div>

      {/* Load button + messages */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={handleLoadSettings}
          disabled={settingsLoading}
          style={{
            background: '#176b3a', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '10px 20px',
            fontSize: '13px', fontWeight: '700',
            cursor: settingsLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {settingsLoading ? '⏳ लोड होत आहे...' : '🔄 Settings लोड करा'}
        </button>
        {saveMsg && (
          <span style={{ color: '#137333', fontWeight: '700', fontSize: '13px' }}>{saveMsg}</span>
        )}
        {settingsError && (
          <span style={{ color: '#c5221f', fontWeight: '700', fontSize: '13px' }}>{settingsError}</span>
        )}
      </div>

      {/* Settings Table (only when rows loaded) */}
      {settingsRows.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: '14px',
          border: '1px solid #dce8de',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          marginBottom: '28px', overflowX: 'auto'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f8f5', borderBottom: '2px solid #dce8de' }}>
                {['Key', 'Value', 'Description', 'Category', 'Actions'].map(h => (
                  <th key={h} style={{ ...cellStyle, fontWeight: '700', color: '#176b3a', fontSize: '12px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {settingsRows.map(row => {
                const isSensitive = SENSITIVE_PATTERN.test(row.key);
                const isVisible = visibleKeys[row.key];
                const isEditing = editingKey === row.key;
                const badge = getBadge(row.key);
                return (
                  <tr key={row.key} style={{ background: isEditing ? '#f0f9f3' : 'transparent' }}>
                    {/* Key */}
                    <td style={{ ...cellStyle, fontFamily: 'monospace', fontWeight: '700', color: '#27382d' }}>
                      {row.key}
                    </td>
                    {/* Value */}
                    <td style={{ ...cellStyle, minWidth: '180px' }}>
                      {isEditing ? (
                        <input
                          autoFocus
                          type={isSensitive && !isVisible ? 'password' : 'text'}
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          style={{
                            width: '100%', padding: '6px 10px',
                            border: '1.5px solid #176b3a', borderRadius: '6px',
                            fontSize: '13px', fontFamily: isSensitive ? 'monospace' : 'inherit'
                          }}
                        />
                      ) : (
                        <span style={{ fontFamily: isSensitive ? 'monospace' : 'inherit', fontSize: '13px' }}>
                          {isSensitive && !isVisible
                            ? '••••••••'
                            : (row.value || <em style={{ color: '#aaa' }}>रिकामे</em>)}
                        </span>
                      )}
                      {isSensitive && (
                        <button
                          onClick={() => toggleVisibility(row.key)}
                          title={isVisible ? 'लपवा' : 'दाखवा'}
                          style={{
                            marginLeft: '6px', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: '14px', verticalAlign: 'middle'
                          }}
                        >
                          {isVisible ? '🙈' : '👁️'}
                        </button>
                      )}
                    </td>
                    {/* Description */}
                    <td style={{ ...cellStyle, color: '#65776d', maxWidth: '220px' }}>
                      {row.description || '—'}
                    </td>
                    {/* Category badge */}
                    <td style={{ ...cellStyle }}>
                      <span style={{
                        background: badge.bg, color: badge.color,
                        borderRadius: '20px', padding: '2px 10px',
                        fontSize: '11.5px', fontWeight: '700', whiteSpace: 'nowrap'
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    {/* Actions */}
                    <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <span style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleSaveSetting(row.key)}
                            disabled={savingKey === row.key}
                            style={{
                              background: '#176b3a', color: '#fff',
                              border: 'none', borderRadius: '6px',
                              padding: '5px 12px', fontSize: '12px',
                              fontWeight: '700', cursor: savingKey === row.key ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {savingKey === row.key ? '⏳' : '💾 सेव्ह'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              background: '#f5f5f5', color: '#555',
                              border: '1px solid #ccc', borderRadius: '6px',
                              padding: '5px 10px', fontSize: '12px',
                              fontWeight: '600', cursor: 'pointer'
                            }}
                          >
                            ✕ रद्द
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(row)}
                          style={{
                            background: '#e8f5e9', color: '#176b3a',
                            border: '1px solid #c8e6c9', borderRadius: '6px',
                            padding: '5px 12px', fontSize: '12px',
                            fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          ✏️ संपादित करा
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Suggested Keys guide table */}
      <div style={{
        background: '#fff', borderRadius: '14px',
        border: '1px solid #dce8de',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: '#176b3a', fontWeight: '800' }}>
          📋 Sheet मध्ये हे Key असणे अपेक्षित आहे
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#65776d' }}>
          तुमच्या Google Sheet च्या <strong>Settings</strong> टॅबमध्ये खालील key/value rows ठेवा:
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f8f5', borderBottom: '2px solid #dce8de' }}>
                {['Key', 'विवरण (Description)', 'उदाहरण (Example)'].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    fontSize: '12px', fontWeight: '700', color: '#176b3a'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUGGESTED_KEYS.map((sk, i) => {
                const badge = getBadge(sk.key);
                return (
                  <tr key={sk.key} style={{ background: i % 2 === 0 ? '#fafcfa' : '#fff' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12.5px', fontWeight: '700', color: '#27382d' }}>
                      {sk.key}
                      <span style={{
                        marginLeft: '8px',
                        background: badge.bg, color: badge.color,
                        borderRadius: '20px', padding: '1px 8px',
                        fontSize: '10.5px', fontWeight: '700'
                      }}>{badge.label}</span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: '12.5px', color: '#444' }}>{sk.desc}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#65776d' }}>{sk.example}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ─── CategoriesTab sub-component ─────────────────────────────────────────────
function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    nameEn: '',
    sortOrder: 1,
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllSheetCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message || 'श्रेणी लोड करताना त्रुटी आली.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenAddModal = () => {
    const nextOrder = categories.length > 0 
      ? Math.max(...categories.map(c => Number(c.sortOrder) || 0)) + 1 
      : 1;
    setEditingItem(null);
    setFormData({
      id: 'cat_' + Date.now().toString().slice(-6),
      name: '',
      nameEn: '',
      sortOrder: nextOrder,
      isActive: true
    });
    setSaveSuccess('');
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingItem(cat);
    setFormData({
      id: cat.id || '',
      name: cat.name || '',
      nameEn: cat.nameEn || '',
      sortOrder: cat.sortOrder ?? 1,
      isActive: cat.isActive !== false
    });
    setSaveSuccess('');
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setSaveError('कृपया श्रेणीचे मराठी नाव प्रविष्ट करा.');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await saveSheetCategory(formData);
      setSaveSuccess(editingItem ? 'श्रेणी यशस्वीरीत्या अद्ययावत केली!' : 'नवीन श्रेणी यशस्वीरीत्या जोडली!');
      triggerSavePopup({
        title: editingItem ? 'श्रेणी अपडेट झाली! ✓' : 'नवीन श्रेणी जोडली! 🎉',
        message: `"${formData.name}" श्रेणी Google Sheet Categories टॅबमध्ये सुरक्षित सेव्ह झाली.`,
        details: [
          { label: 'आयडी', value: formData.id },
          { label: 'मराठी नाव', value: formData.name },
          { label: 'इंग्रजी नाव', value: formData.nameEn || '—' },
          { label: 'क्रम', value: String(formData.sortOrder) }
        ]
      });
      // Update local state immediately
      setCategories(prev => {
        const exists = prev.some(c => c.id === formData.id);
        if (exists) {
          return prev.map(c => c.id === formData.id ? { ...c, ...formData } : c);
        } else {
          return [...prev, { ...formData }];
        }
      });
      setTimeout(() => {
        setIsModalOpen(false);
        setEditingItem(null);
        setSaveSuccess('');
      }, 900);
    } catch (err) {
      setSaveError(err.message || 'श्रेणी सेव्ह करताना त्रुटी आली.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.nameEn && c.nameEn.toLowerCase().includes(q)) ||
      (c.id && c.id.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Top Header & Actions */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#176b3a', fontWeight: '800' }}>
            🏷️ उत्पादन श्रेणी व्यवस्थापन (Categories Sheet)
          </h2>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#65776d' }}>
            Google Sheet मधील 'Categories' टॅबमधून श्रेणी पहा, नवीन श्रेणी जोडा किंवा संपादित करा.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={loadCategories}
            disabled={loading}
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: '1px solid #dce8de', background: '#f8faf9',
              fontSize: '12.5px', fontWeight: '700', color: '#2d3748',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳ लोड होत आहे...' : '🔄 रिफ्रेश'}
          </button>

          <button
            onClick={handleOpenAddModal}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: 'none', background: '#176b3a',
              fontSize: '12.5px', fontWeight: '700', color: '#ffffff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 6px rgba(23,107,58,0.2)'
            }}
          >
            <span>➕</span> नवीन श्रेणी जोडा
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 श्रेणी शोधा (नाव किंवा आयडी)..."
          style={{
            width: '100%', maxWidth: '360px',
            padding: '9px 14px', borderRadius: '8px',
            border: '1px solid #dce8de', fontSize: '13px',
            outline: 'none', background: '#fafcfa'
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px',
          background: '#fde8e8', color: '#c81e1e',
          fontSize: '13px', marginBottom: '16px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Categories Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f1f5f2', borderBottom: '2px solid #dce8de', color: '#2d3748' }}>
              <th style={{ padding: '12px 14px', fontWeight: '700' }}>आयडी (ID)</th>
              <th style={{ padding: '12px 14px', fontWeight: '700' }}>मराठी नाव (Name MR)</th>
              <th style={{ padding: '12px 14px', fontWeight: '700' }}>इंग्रजी नाव (Name EN)</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>क्रम (Order)</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>स्थिती (Status)</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>क्रिया (Action)</th>
            </tr>
          </thead>
          <tbody>
            {loading && categories.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#718096' }}>
                  ⏳ Google Sheet मधून श्रेणी लोड होत आहेत...
                </td>
              </tr>
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#718096' }}>
                  कोणतीही श्रेणी आढळली नाही.
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat, idx) => (
                <tr
                  key={cat.id || idx}
                  style={{
                    borderBottom: '1px solid #edf2f7',
                    background: idx % 2 === 0 ? '#ffffff' : '#fafbfa'
                  }}
                >
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '600', color: '#4a5568' }}>
                    {cat.id}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: '700', color: '#176b3a' }}>
                    {cat.name}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#4a5568' }}>
                    {cat.nameEn || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600' }}>
                    {cat.sortOrder ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      background: cat.isActive !== false ? '#def7ec' : '#fde8e8',
                      color: cat.isActive !== false ? '#03543f' : '#9b1c1c'
                    }}>
                      {cat.isActive !== false ? 'सक्रिय' : 'बंद'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleOpenEditModal(cat)}
                      style={{
                        padding: '5px 12px', borderRadius: '6px',
                        border: '1px solid #cbd5e0', background: '#ffffff',
                        fontSize: '12px', fontWeight: '600', color: '#2b6cb0',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ संपादन
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '14px',
            width: '100%', maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              background: '#176b3a', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                {editingItem ? '✏️ श्रेणी संपादन करा' : '➕ नवीन श्रेणी जोडा'}
              </h3>
              <button
                onClick={handleCloseModal}
                disabled={saving}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#ffffff', fontSize: '20px', cursor: 'pointer', lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCategory} style={{ padding: '20px' }}>
              {saveSuccess && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px',
                  background: '#def7ec', color: '#03543f',
                  fontSize: '13px', marginBottom: '14px', fontWeight: '600'
                }}>
                  ✅ {saveSuccess}
                </div>
              )}
              {saveError && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px',
                  background: '#fde8e8', color: '#9b1c1c',
                  fontSize: '13px', marginBottom: '14px'
                }}>
                  ⚠️ {saveError}
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '6px' }}>
                  श्रेणी आयडी (Category ID):
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  required
                  placeholder="उदा. fertilizers, seeds, pesticides"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#718096' }}>
                  इंग्रजीत एक शब्द किंवा कोड (उदा. खते = fertilizers)
                </span>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '6px' }}>
                  मराठी नाव (Name in Marathi) *:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="उदा. खते व पोषण, कीटकनाशके"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '6px' }}>
                  इंग्रजी नाव (Name in English):
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="उदा. Fertilizers & Nutrition"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '6px' }}>
                    क्रम (Sort Order):
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '8px',
                      border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#2d3748', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    सक्रिय आहे (Active)
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  style={{
                    padding: '9px 16px', borderRadius: '8px',
                    border: '1px solid #cbd5e0', background: '#ffffff',
                    fontSize: '13px', fontWeight: '600', color: '#4a5568',
                    cursor: 'pointer'
                  }}
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '9px 20px', borderRadius: '8px',
                    border: 'none', background: '#176b3a',
                    fontSize: '13px', fontWeight: '700', color: '#ffffff',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? '💾 जतन होत आहे...' : '💾 जतन करा (Save)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── ServicesTab sub-component ───────────────────────────────────────────────
function ServicesTab() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [portalConsultancyEnabled, setPortalConsultancyEnabled] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    nameMr: '',
    nameEn: '',
    crop: '',
    cardImageUrl: '',
    slideshowImages: '',
    descriptionMr: '',
    descriptionEn: '',
    keyBenefitsMr: '',
    farmerFeedback: '',
    isActive: true,
    showOnPortal: true,
    sortOrder: 1
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllServices();
      setServices(data);

      // Check setting
      try {
        const cache = JSON.parse(localStorage.getItem('sksk_sheet_settings_cache') || '[]');
        const found = cache.find(s => s.key === 'show_consultancy_services');
        if (found) {
          setPortalConsultancyEnabled(found.value !== 'false');
        }
      } catch {}
    } catch (err) {
      setError(err.message || 'सेवा लोड करताना त्रुटी आली.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePortalVisibility = async () => {
    const nextVal = !portalConsultancyEnabled;
    setSavingToggle(true);
    try {
      await saveSheetSetting('show_consultancy_services', String(nextVal));
      setPortalConsultancyEnabled(nextVal);
      triggerSavePopup({
        title: nextVal ? 'कन्सल्टन्सी सेवा चालू केली! ✓' : 'कन्सल्टन्सी सेवा लपवली! ✓',
        message: nextVal ? 'पोर्टलवर सेवा पेजवर कन्सल्टन्सी कार्ड्स दिसतील.' : 'पोर्टलवर कन्सल्टन्सी कार्ड्स तात्पुरते लपवले आहेत.'
      });
    } catch (err) {
      alert('सेटिंग बदलताना त्रुटी: ' + err.message);
    } finally {
      setSavingToggle(false);
    }
  };

  const handleOpenAddModal = () => {
    const nextOrder = services.length > 0 
      ? Math.max(...services.map(s => Number(s.sortOrder) || 0)) + 1 
      : 1;
    setEditingItem(null);
    setFormData({
      id: 'serv_' + Date.now().toString().slice(-6),
      nameMr: '',
      nameEn: '',
      crop: '',
      cardImageUrl: '',
      slideshowImages: '',
      descriptionMr: '',
      descriptionEn: '',
      keyBenefitsMr: '',
      farmerFeedback: '',
      isActive: true,
      showOnPortal: true,
      sortOrder: nextOrder
    });
    setSaveSuccess('');
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (serv) => {
    setEditingItem(serv);
    setFormData({
      id: serv.id || '',
      nameMr: serv.nameMr || '',
      nameEn: serv.nameEn || '',
      crop: serv.crop || '',
      cardImageUrl: serv.cardImageUrl || '',
      slideshowImages: serv.slideshowImages || '',
      descriptionMr: serv.descriptionMr || '',
      descriptionEn: serv.descriptionEn || '',
      keyBenefitsMr: serv.keyBenefitsMr || '',
      farmerFeedback: serv.farmerFeedback || '',
      isActive: serv.isActive !== false,
      showOnPortal: serv.showOnPortal !== false,
      sortOrder: serv.sortOrder ?? 1
    });
    setSaveSuccess('');
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!formData.nameMr.trim()) {
      setSaveError('कृपया सेवेचे मराठी नाव प्रविष्ट करा.');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await saveServiceItem(formData);
      setSaveSuccess(editingItem ? 'सेवा माहिती यशस्वीरीत्या अद्ययावत केली!' : 'नवीन सेवा यशस्वीरीत्या जोडली!');
      triggerSavePopup({
        title: editingItem ? 'सेवा अपडेट झाली! ✓' : 'नवीन सेवा जोडली! 🎉',
        message: `"${formData.nameMr}" सेवा Google Sheet व पोर्टलवर सेव्ह झाली.`,
        details: [
          { label: 'सेवा नाव', value: formData.nameMr },
          { label: 'पीक', value: formData.crop || '—' },
          { label: 'पोर्टल स्थिती', value: formData.showOnPortal ? 'दाखवा (Visible)' : 'लपवा (Hidden)' }
        ]
      });

      // Update local state immediately
      setServices(prev => {
        const exists = prev.some(s => s.id === formData.id);
        if (exists) {
          return prev.map(s => s.id === formData.id ? { ...s, ...formData } : s);
        } else {
          return [...prev, { ...formData }];
        }
      });

      setTimeout(() => {
        setIsModalOpen(false);
        setEditingItem(null);
        setSaveSuccess('');
      }, 900);
    } catch (err) {
      setSaveError(err.message || 'सेवा सेव्ह करताना त्रुटी आली.');
    } finally {
      setSaving(false);
    }
  };

  const filteredServices = services.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.nameMr && s.nameMr.toLowerCase().includes(q)) ||
      (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
      (s.crop && s.crop.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Top Banner & Actions */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#176b3a', fontWeight: '800' }}>
            🛠️ कृषी सेवा व कन्सल्टन्सी व्यवस्थापन (Services Sheet)
          </h2>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#65776d' }}>
            द्राक्ष, टोमॅटो, डाळिंब, कलिंगड व इतर पीक कन्सल्टन्सी सेवा, फोटो लिंक्स, स्लाईडशो आणि यशोगाथा नियंत्रित करा.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Main Portal Toggle */}
          <button
            onClick={handleTogglePortalVisibility}
            disabled={savingToggle}
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: portalConsultancyEnabled ? '1.5px solid #22a35a' : '1.5px solid #cbd5e0',
              background: portalConsultancyEnabled ? '#eaf6ee' : '#f8faf9',
              color: portalConsultancyEnabled ? '#135c2d' : '#64748b',
              fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
            title="पोर्टलवर कन्सल्टन्सी सेवा विभाग दाखवायचा की नाही"
          >
            <span>{portalConsultancyEnabled ? '🟢' : '⚪'}</span>
            पोर्टलवर सेवा दाखवा: {portalConsultancyEnabled ? 'चालू (Visible)' : 'बंद (Hidden)'}
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: '1px solid #dce8de', background: '#f8faf9',
              fontSize: '12.5px', fontWeight: '700', color: '#2d3748',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳ लोड होत आहे...' : '🔄 रिफ्रेश'}
          </button>

          <button
            onClick={handleOpenAddModal}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: 'none', background: '#176b3a',
              fontSize: '12.5px', fontWeight: '700', color: '#ffffff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 6px rgba(23,107,58,0.2)'
            }}
          >
            <span>➕</span> नवीन सेवा जोडा
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 सेवा किंवा पीक शोधा (उदा. द्राक्ष, Tomato, डाळिंब)..."
          style={{
            width: '100%', maxWidth: '360px',
            padding: '9px 14px', borderRadius: '8px',
            border: '1px solid #dce8de', fontSize: '13px',
            outline: 'none', background: '#fafcfa'
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px',
          background: '#fde8e8', color: '#c81e1e',
          fontSize: '13px', marginBottom: '16px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Services Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f1f5f2', borderBottom: '2px solid #dce8de', color: '#2d3748' }}>
              <th style={{ padding: '12px 14px', fontWeight: '700' }}>फोटो</th>
              <th style={{ padding: '12px 14px', fontWeight: '700' }}>सेवेचे नाव (मराठी / English)</th>
              <th style={{ padding: '12px 14px', fontWeight: '700' }}>पीक (Crop)</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>स्लाईडशो</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>पोर्टलवर</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>स्थिती</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>क्रम</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>क्रिया</th>
            </tr>
          </thead>
          <tbody>
            {loading && services.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#718096' }}>
                  ⏳ Google Sheet मधून सेवा लोड होत आहेत...
                </td>
              </tr>
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#718096' }}>
                  कोणतीही सेवा आढळली नाही.
                </td>
              </tr>
            ) : (
              filteredServices.map((serv, idx) => {
                const slideCount = serv.slideshowImages ? serv.slideshowImages.split(',').filter(Boolean).length : 0;
                return (
                  <tr
                    key={serv.id || idx}
                    style={{
                      borderBottom: '1px solid #edf2f7',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafbfa'
                    }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <img
                        src={serv.cardImageUrl || DEFAULT_SERVICE_IMAGE}
                        alt=""
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_SERVICE_IMAGE; }}
                        style={{ width: '45px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                      />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <strong style={{ color: '#176b3a', display: 'block', fontSize: '13.5px' }}>{serv.nameMr}</strong>
                      <span style={{ fontSize: '11.5px', color: '#65776d' }}>{serv.nameEn || '—'}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#2d3748' }}>
                      {serv.crop || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px',
                        background: slideCount > 0 ? '#e0f2fe' : '#f1f5f9',
                        color: slideCount > 0 ? '#0284c7' : '#94a3b8',
                        fontSize: '11.5px', fontWeight: '700'
                      }}>
                        🖼️ {slideCount} फोटो
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '12px',
                        fontSize: '11px', fontWeight: '700',
                        background: serv.showOnPortal !== false ? '#def7ec' : '#fde8e8',
                        color: serv.showOnPortal !== false ? '#03543f' : '#9b1c1c'
                      }}>
                        {serv.showOnPortal !== false ? 'दाखवा' : 'लपवा'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '12px',
                        fontSize: '11px', fontWeight: '700',
                        background: serv.isActive !== false ? '#def7ec' : '#fde8e8',
                        color: serv.isActive !== false ? '#03543f' : '#9b1c1c'
                      }}>
                        {serv.isActive !== false ? 'सक्रिय' : 'बंद'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600' }}>
                      {serv.sortOrder ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenEditModal(serv)}
                        style={{
                          padding: '5px 12px', borderRadius: '6px',
                          border: '1px solid #cbd5e0', background: '#ffffff',
                          fontSize: '12px', fontWeight: '600', color: '#2b6cb0',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ संपादन
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '14px',
            width: '100%', maxWidth: '640px', maxHeight: '90vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              background: '#176b3a', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                {editingItem ? '✏️ सेवा संपादन करा' : '➕ नवीन सेवा जोडा'}
              </h3>
              <button
                onClick={handleCloseModal}
                disabled={saving}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#ffffff', fontSize: '20px', cursor: 'pointer', lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveService} style={{ padding: '20px', overflowY: 'auto' }}>
              {saveSuccess && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px',
                  background: '#def7ec', color: '#03543f',
                  fontSize: '13px', marginBottom: '14px', fontWeight: '600'
                }}>
                  ✅ {saveSuccess}
                </div>
              )}
              {saveError && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px',
                  background: '#fde8e8', color: '#9b1c1c',
                  fontSize: '13px', marginBottom: '14px'
                }}>
                  ⚠️ {saveError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '4px' }}>
                    मराठी नाव (Service Name MR) *:
                  </label>
                  <input
                    type="text"
                    value={formData.nameMr}
                    onChange={(e) => setFormData({ ...formData, nameMr: e.target.value })}
                    required
                    placeholder="उदा. द्राक्ष पीक सल्ला व कन्सल्टन्सी"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '4px' }}>
                    इंग्रजी नाव (Service Name EN):
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="उदा. Grapes Crop Consultancy"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '4px' }}>
                    पीक नाव (Crop Name):
                  </label>
                  <input
                    type="text"
                    value={formData.crop}
                    onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                    placeholder="उदा. द्राक्ष, टोमॅटो, डाळिंब, कलिंगड"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '4px' }}>
                    क्रम (Sort Order):
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '4px' }}>
                  कार्ड फोटो लिंक (Card Image URL - Web Link):
                </label>
                <input
                  type="url"
                  value={formData.cardImageUrl}
                  onChange={(e) => setFormData({ ...formData, cardImageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '11px', color: '#718096' }}>
                  वेबसाईटवरील फोटो लिंक टाका. रिकामे असल्यास किंवा फोटो न दिसल्यास आपोआप डीफॉल्ट फोटो दिसेल.
                </span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '4px' }}>
                  स्लाईडशो फोटो लिंक्स (Slideshow Image URLs - Comma Separated):
                </label>
                <textarea
                  rows={2}
                  value={formData.slideshowImages}
                  onChange={(e) => setFormData({ ...formData, slideshowImages: e.target.value })}
                  placeholder="उदा. https://image1.jpg, https://image2.jpg, https://image3.jpg"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '12px', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '11px', color: '#718096' }}>
                  कन्सल्टन्सी माहिती पॉपअपमध्ये स्लाईडशो दाखवण्यासाठी २ किंवा अधिक फोटो लिंक्स स्वल्पविरामाने (comma) वेगळ्या करा.
                </span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '4px' }}>
                  सविस्तर माहिती / सल्ला (Detailed Description MR):
                </label>
                <textarea
                  rows={3}
                  value={formData.descriptionMr}
                  onChange={(e) => setFormData({ ...formData, descriptionMr: e.target.value })}
                  placeholder="लागवडीपासून काढणीपर्यंत संपूर्ण तांत्रिक मार्गदर्शन, खत व फवारणी वेळापत्रक..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '4px' }}>
                  मुख्य फायदे व वैशिष्ट्ये (Key Benefits MR - दर ओळीला एक मुद्दा):
                </label>
                <textarea
                  rows={2}
                  value={formData.keyBenefitsMr}
                  onChange={(e) => setFormData({ ...formData, keyBenefitsMr: e.target.value })}
                  placeholder="• कीड व रोगाचे आगाऊ नियंत्रण&#10;• अधिक उत्पादन व योग्य आकार&#10;• कमी खर्चात जास्तीत जास्त नफा"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#4a5568', marginBottom: '4px' }}>
                  शेतकऱ्यांचा अनुभव / यशोगाथा (Farmer Success Story & Feedback):
                </label>
                <textarea
                  rows={2}
                  value={formData.farmerFeedback}
                  onChange={(e) => setFormData({ ...formData, farmerFeedback: e.target.value })}
                  placeholder="उदा. 'स्वराज कन्सल्टन्सीमुळे यंदा मला विक्रमी उत्पादन मिळाले!' - शेतकरी नाव, गाव"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '10px 14px', background: '#f8faf9', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#2d3748', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.showOnPortal}
                    onChange={(e) => setFormData({ ...formData, showOnPortal: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  वेबसाईट पोर्टलवर दाखवा (Show on Portal)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#2d3748', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  सक्रिय आहे (Active)
                </label>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  style={{
                    padding: '9px 16px', borderRadius: '8px',
                    border: '1px solid #cbd5e0', background: '#ffffff',
                    fontSize: '13px', fontWeight: '600', color: '#4a5568',
                    cursor: 'pointer'
                  }}
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '9px 20px', borderRadius: '8px',
                    border: 'none', background: '#176b3a',
                    fontSize: '13px', fontWeight: '700', color: '#ffffff',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? '💾 जतन होत आहे...' : '💾 जतन करा (Save Service)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GoogleSheetsIntegration() {
  const [config, setConfig] = useState(getGoogleSheetsConfig());
  const [webAppUrl, setWebAppUrl] = useState(config.webAppUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingCust, setIsSyncingCust] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('connection');

  const scriptCode = getScriptTemplateCode();

  useEffect(() => {
    setConfig(getGoogleSheetsConfig());
  }, []);

  const handleTestConnection = async (e) => {
    if (e) e.preventDefault();
    if (!webAppUrl.trim()) {
      alert('कृपया Google Apps Script Web App URL प्रविष्ट करा.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGoogleSheetsConnection(webAppUrl.trim());
      setTestResult(res);
      setConfig(getGoogleSheetsConfig());
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'जोडणी अयशस्वी झाली.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveUrl = (e) => {
    e.preventDefault();
    const updated = saveGoogleSheetsConfig({ webAppUrl: webAppUrl.trim() });
    setConfig(updated);
    alert('✅ Web App URL सेव्ह केली!');
  };

  const handleExportAll = async () => {
    if (!webAppUrl.trim()) {
      alert('प्रथम Web App URL जोडा.');
      return;
    }
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await exportAllToGoogleSheet(webAppUrl.trim());
      setSyncResult({
        success: true,
        message: res.message || 'सर्व डेटा गुगल शीटमध्ये यशस्वीरीत्या सिंक झाला!'
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message: 'सिंक करताना त्रुटी: ' + err.message
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncCustomers = async () => {
    if (!webAppUrl.trim()) {
      alert('प्रथम Web App URL जोडा.');
      return;
    }
    setIsSyncingCust(true);
    setSyncResult(null);
    try {
      const res = await syncCustomersWithSheet();
      setSyncResult({
        success: true,
        message: res.count !== undefined
          ? `बिलांवरून ${res.count} ग्राहक शोधून 'Customers' शीटमध्ये यशस्वीरीत्या सिंक झाले!`
          : 'ग्राहक यशस्वीरीत्या सिंक झाले!'
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message: 'ग्राहक सिंक करताना त्रुटी: ' + err.message
      });
    } finally {
      setIsSyncingCust(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
  };

  const isConnected = config.status === 'connected' && !!config.webAppUrl;

  const TABS = [
    { id: 'connection', label: '🔗 जोडणी (Connection)' },
    { id: 'properties', label: '⚙️ Properties (Settings)' },
    { id: 'categories', label: '🏷️ श्रेणी (Categories)' },
    { id: 'services', label: '🛠️ सेवा व्यवस्थापन (Services)' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', color: '#176b3a', fontWeight: '800' }}>
            📊 गुगल शीट्स डेटाबेस इंटिग्रेशन (Google Sheets Database)
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#65776d' }}>
            डेटाबेस म्हणून Google Sheets वापरा — जलद पेजिनेशन (१० रेकॉर्ड्स), ऑटो-स्टॉक आणि ॲनालिटिक्स
          </p>
        </div>

        {/* Live Status Pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: isConnected ? '#e6f4ea' : '#fef7e0',
          border: isConnected ? '1.5px solid #ceead6' : '1.5px solid #feefc3',
          padding: '8px 16px', borderRadius: '30px'
        }}>
          <span style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: isConnected ? '#137333' : '#b06000',
            display: 'inline-block'
          }} />
          <span style={{ fontSize: '12.5px', fontWeight: '700', color: isConnected ? '#137333' : '#b06000' }}>
            {isConnected ? '🟢 Google Sheets जोडले आहे (Live)' : '🟡 स्थानिक डेटाबेस मोड (Local Mode)'}
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '4px',
        marginBottom: '24px',
        borderBottom: '2px solid #dce8de',
        paddingBottom: '0'
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px', border: 'none',
              borderRadius: '8px 8px 0 0',
              background: activeTab === tab.id ? '#176b3a' : '#f0f5f1',
              color: activeTab === tab.id ? '#ffffff' : '#444',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #176b3a' : 'none',
              marginBottom: activeTab === tab.id ? '-2px' : '0',
              transition: 'background 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Connection ── */}
      {activeTab === 'connection' && (
        <>
          {/* Step by step guide card */}
          <div style={{
            background: '#ffffff', borderRadius: '16px',
            border: '1px solid #dce8de', padding: '24px',
            marginBottom: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <h2 style={{ fontSize: '18px', color: '#176b3a', margin: '0 0 8px', fontWeight: '800' }}>
              🚀 Google Sheets कसे जोडायचे? (Step-by-Step Guide)
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#555' }}>
              खालील ४ सोप्या पायऱ्या फॉलो करून तुमचे स्वतःचे Google Sheet या ॲप्लिकेशनसोबत मोफत कनेक्ट करा:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { n: '१', title: 'नवीन Google Sheet बनवा', body: "तुमच्या Google Drive वर जाऊन एक नवीन Spreadsheet बनवा (उदा. 'Swaraj_KSK_Database')." },
                { n: '२', title: 'Apps Script उघडा', body: 'Google Sheet मधील मेनू बारमध्ये Extensions वर क्लिक करा आणि Apps Script निवडा.' },
                { n: '३', title: 'स्क्रिप्ट पेस्ट करा', body: 'खाली दिलेला संपूर्ण कोड एका क्लिकवर कॉपी करा आणि Apps Script मधील सर्व जुना कोड काढून तिथे पेस्ट करा व सेव्ह (Ctrl+S) करा.' },
                { n: '४', title: 'Web App म्हणून Deploy करा', body: 'Deploy ➔ New deployment (किंवा जुनी डिप्लॉयमेंट अपडेट करताना Manage Deployments ➔ Edit ➔ New Version) ➔ Type: Web app ➔ Who has access: Anyone निवडून Deploy करा व URL कॉपी करा.' },
              ].map(step => (
                <div key={step.n} style={{ background: '#f8faf9', border: '1px solid #c2d6c7', borderRadius: '12px', padding: '16px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: '#176b3a', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '800', fontSize: '14px', marginBottom: '10px'
                  }}>{step.n}</div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#27382d' }}>{step.title}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#65776d', lineHeight: '1.5' }}>{step.body}</p>
                </div>
              ))}
            </div>

            {/* Connection Form */}
            <div style={{ background: '#f4f8f5', border: '1.5px solid #c8dcd0', borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '16px', color: '#176b3a' }}>
                🔗 Google Apps Script Web App URL लिंक करा
              </h3>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  style={{
                    flex: 1, minWidth: '280px', padding: '11px 14px',
                    borderRadius: '8px', border: '1.5px solid #176b3a',
                    fontSize: '13px', fontWeight: '600', background: '#ffffff'
                  }}
                />
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleTestConnection}
                  style={{
                    background: '#176b3a', color: '#ffffff', border: 'none',
                    borderRadius: '8px', padding: '11px 18px',
                    fontSize: '13px', fontWeight: '700',
                    cursor: isTesting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isTesting ? '⏳ जोडणी तपासत आहे...' : '⚡ जोडणी तपासा (Test Ping)'}
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleExportAll}
                  style={{
                    background: '#2d4b35', color: '#ffffff', border: 'none',
                    borderRadius: '8px', padding: '11px 18px',
                    fontSize: '13px', fontWeight: '700',
                    cursor: isSyncing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSyncing ? '⏳ सिंक होत आहे...' : '🔄 सर्व डेटा शीटमध्ये सिंक करा'}
                </button>
                <button
                  type="button"
                  disabled={isSyncingCust}
                  onClick={handleSyncCustomers}
                  style={{
                    background: '#1b6336', color: '#ffffff', border: 'none',
                    borderRadius: '8px', padding: '11px 18px',
                    fontSize: '13px', fontWeight: '700',
                    cursor: isSyncingCust ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSyncingCust ? '⏳ ग्राहक सिंक होत आहेत...' : '👥 ग्राहक यादी सिंक करा'}
                </button>
              </div>

              {testResult && (
                <div style={{
                  background: testResult.success ? '#e6f4ea' : '#fce8e6',
                  border: testResult.success ? '1px solid #ceead6' : '1px solid #fad2cf',
                  color: testResult.success ? '#137333' : '#c5221f',
                  padding: '12px 14px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '600', marginBottom: '10px'
                }}>
                  {testResult.message}
                  {testResult.latencyMs && ` (वेळ: ${testResult.latencyMs} ms)`}
                </div>
              )}

              {syncResult && (
                <div style={{
                  background: syncResult.success ? '#e6f4ea' : '#fce8e6',
                  border: syncResult.success ? '1px solid #ceead6' : '1px solid #fad2cf',
                  color: syncResult.success ? '#137333' : '#c5221f',
                  padding: '12px 14px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '600'
                }}>
                  {syncResult.message}
                </div>
              )}
            </div>
          </div>

          {/* Tabs Schema Explanation */}
          <div style={{
            background: '#ffffff', borderRadius: '16px',
            border: '1px solid #dce8de', padding: '24px',
            marginBottom: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '17px', color: '#176b3a', fontWeight: '800' }}>
              📑 गुगल शीटमधील आपोआप तयार होणारे टॅब्स (Multiple Tabs in Single Sheet)
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#555' }}>
              एकाच Google Spreadsheet मध्ये खालील ११ स्वतंत्र टॅब्स आपोआप नियंत्रित केले जातात:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {[
                { num: '1', name: 'Stats',          desc: 'कॅश्ड आकडेवारी व एकूण काउंट्स. API ला वेग देण्यासाठी स्वतंत्र मेंटेन होते.' },
                { num: '2', name: 'Inventory',      desc: 'उपलब्ध साठा, खरेदी दर, विक्री दर (MRP) आणि किमान स्टॉक इशारा पातळी.' },
                { num: '3', name: 'Purchase_Lots',  desc: 'घाऊक खरेदी लॉट नोंदी, सप्लायर नाव, खरेदी संख्या व एकूण किंमत.' },
                { num: '4', name: 'Bills / Bills_YYYY_MM', desc: 'मासिक डिजिटल बिले (उदा. Bills_2026_11), भरलेली रक्कम, उधारी बाकी, कन्सल्टन्सी पीक माहिती.' },
                { num: '5', name: 'Challans',       desc: 'डिलिव्हरी चालने, पोच पावत्या, वाहन क्रमांक व मालाचा तपशील.' },
                { num: '6', name: 'Customers',      desc: 'शेतकरी ग्राहक डिरेक्टरी, एकूण खरेदी, जमा रक्कम आणि उधारी खाते (१०-१० पेजिनेशन).' },
                { num: '7', name: 'Consultancy_Customers', desc: 'कन्सल्टन्सी शेतकरी नोंदणी, पीक, क्षेत्र (एकर), नियोजन व औषधे ट्रॅकिंग.' },
                { num: '8', name: 'Users',          desc: 'व्यवस्थापक (Admin), कर्मचारी व शेतकरी युझर्स आयडी व पासवर्ड्स.' },
                { num: '9', name: 'Categories',     desc: 'उत्पादन श्रेणी (उदा. खते, कीटकनाशके, बियाणे).' },
                { num: '10', name: 'Services',      desc: 'कृषी सल्लागार सेवा, शेतकरी अभिप्राय व माहिती.' },
                { num: '11', name: 'Settings',      desc: 'दुकानाची माहिती, प्रोप्रायटर नाव, फोन व पत्ता.' },
              ].map(t => (
                <div key={t.num} style={{ border: '1px solid #e1e8e3', borderRadius: '10px', padding: '12px', background: '#fafcfa' }}>
                  <strong style={{ color: '#176b3a', fontSize: '13.5px' }}>{t.num}. {t.name}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#65776d' }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alert for Updating Script */}
          <div style={{
            background: '#e8f4fd', border: '1.5px solid #90caf9',
            borderRadius: '12px', padding: '16px 20px',
            marginBottom: '20px', fontSize: '13px', color: '#0d47a1',
            display: 'flex', alignItems: 'flex-start', gap: '12px'
          }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>💡</span>
            <div>
              <strong style={{ fontSize: '14px', color: '#0b3c74' }}>
                शीटमधील स्क्रिप्ट अपडेट कशी करावी? (How to update existing script in Google Sheets):
              </strong>
              <ol style={{ margin: '6px 0 0', paddingLeft: '18px', lineHeight: '1.6', color: '#1565c0' }}>
                <li>खालील हिरव्या <strong>'📋 संपूर्ण कोड कॉपी करा'</strong> बटनावर क्लिक करा.</li>
                <li>तुमच्या Google Sheet मध्ये जा ➔ वरच्या मेन्यूमध्ये <strong>Extensions ➔ Apps Script</strong> उघडा.</li>
                <li><code>Code.gs</code> मधील जुना कोड पूर्ण काढून हा नवीन कोड पेस्ट करा आणि <strong>Ctrl+S (Save)</strong> दाबा.</li>
                <li>
                  वरच्या उजव्या बाजूला <strong>Deploy ➔ Manage deployments</strong> निवडा, पेन्सिल (✏️ Edit) आयकॉनवर क्लिक करा, Version मध्ये <strong>'New version'</strong> निवडा आणि <strong>Deploy</strong> वर क्लिक करा.
                </li>
              </ol>
            </div>
          </div>

          {/* Copy Code Box */}
          <div style={{
            background: '#ffffff', borderRadius: '16px',
            border: '1px solid #dce8de', padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '17px', color: '#176b3a', fontWeight: '800' }}>
                  📋 Google Apps Script बॅकएंड कोड (Code.gs)
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#65776d' }}>
                  हा कोड पूर्ण तयार असून यात सर्व API ऑपरेशन्स, स्टॉक डिडक्शन आणि पेजिनेशन समाविष्ट आहे.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                style={{
                  background: copyCodeSuccess ? '#137333' : '#176b3a',
                  color: '#ffffff', border: 'none', borderRadius: '8px',
                  padding: '9px 18px', fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                }}
              >
                {copyCodeSuccess ? '✓ कोड कॉपी झाला!' : '📋 संपूर्ण कोड कॉपी करा'}
              </button>
            </div>
            <pre style={{
              background: '#1e2421', color: '#e4f0e7',
              padding: '16px', borderRadius: '10px',
              overflowX: 'auto', maxHeight: '380px',
              fontSize: '12px', fontFamily: "'Courier New', Courier, monospace",
              lineHeight: '1.45'
            }}>
              {scriptCode}
            </pre>
          </div>
        </>
      )}

      {/* ── Tab: Properties ── */}
      {activeTab === 'properties' && (
        <div style={{
          background: '#ffffff', borderRadius: '16px',
          border: '1px solid #dce8de', padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <PropertiesTab />
        </div>
      )}

      {/* ── Tab: Categories ── */}
      {activeTab === 'categories' && (
        <div style={{
          background: '#ffffff', borderRadius: '16px',
          border: '1px solid #dce8de', padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <CategoriesTab />
        </div>
      )}

      {/* ── Tab: Services ── */}
      {activeTab === 'services' && (
        <div style={{
          background: '#ffffff', borderRadius: '16px',
          border: '1px solid #dce8de', padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <ServicesTab />
        </div>
      )}
    </div>
  );
}
