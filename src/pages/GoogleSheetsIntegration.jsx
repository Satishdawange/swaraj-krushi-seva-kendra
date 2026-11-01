import React, { useState, useEffect } from 'react';
import {
  getGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  testGoogleSheetsConnection,
  exportAllToGoogleSheet,
  getScriptTemplateCode,
  fetchAllSheetSettings,
  saveSheetSetting
} from '../service/googleSheetsService';
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GoogleSheetsIntegration() {
  const [config, setConfig] = useState(getGoogleSheetsConfig());
  const [webAppUrl, setWebAppUrl] = useState(config.webAppUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
  };

  const isConnected = config.status === 'connected' && !!config.webAppUrl;

  const TABS = [
    { id: 'connection', label: '🔗 जोडणी (Connection)' },
    { id: 'properties', label: '⚙️ Properties (Settings)' },
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
                { n: '३', title: 'स्क्रिप्ट पेस्ट करा', body: 'खाली दिलेला संपूर्ण कोड एका क्लिकवर कॉपी करा आणि Apps Script मधील सर्व जुना कोड काढून तिथे पेस्ट करा.' },
                { n: '४', title: 'Web App म्हणून Deploy करा', body: 'Deploy ➔ New deployment ➔ Type: Web app ➔ Who has access: Anyone निवडून Deploy करा व URL कॉपी करा.' },
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
              एकाच Google Spreadsheet मध्ये खालील ८ स्वतंत्र टॅब्स आपोआप नियंत्रित केले जातात:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {[
                { num: '1', name: 'Stats',          desc: 'कॅश्ड आकडेवारी व एकूण काउंट्स. API ला वेग देण्यासाठी स्वतंत्र मेंटेन होते.' },
                { num: '2', name: 'Inventory',      desc: 'उपलब्ध साठा, खरेदी दर, विक्री दर (MRP) आणि किमान स्टॉक इशारा पातळी.' },
                { num: '3', name: 'Purchase_Lots',  desc: 'घाऊक खरेदी लॉट नोंदी, सप्लायर नाव, खरेदी संख्या व एकूण किंमत.' },
                { num: '4', name: 'Bills',          desc: 'डिजिटल बिले, भरलेली रक्कम, उधारी बाकी, पेमेंट प्रकार व मालाची यादी.' },
                { num: '5', name: 'Challans',       desc: 'डिलिव्हरी चालने, पोच पावत्या, वाहन क्रमांक व मालाचा तपशील.' },
                { num: '6', name: 'Customers',      desc: 'शेतकरी ग्राहक डिरेक्टरी, एकूण खरेदी, जमा रक्कम आणि उधारी खाते.' },
                { num: '7', name: 'Users',          desc: 'व्यवस्थापक (Admin), कर्मचारी व शेतकरी युझर्स आयडी व पासवर्ड्स.' },
                { num: '8', name: 'Settings',       desc: 'दुकानाची माहिती, प्रोप्रायटर नाव, फोन व पत्ता.' },
              ].map(t => (
                <div key={t.num} style={{ border: '1px solid #e1e8e3', borderRadius: '10px', padding: '12px', background: '#fafcfa' }}>
                  <strong style={{ color: '#176b3a', fontSize: '13.5px' }}>{t.num}. {t.name}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#65776d' }}>{t.desc}</p>
                </div>
              ))}
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
    </div>
  );
}
