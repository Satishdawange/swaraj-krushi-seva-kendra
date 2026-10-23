import React, { useState, useEffect } from 'react';
import {
  getGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  testGoogleSheetsConnection,
  exportAllToGoogleSheet,
  getScriptTemplateCode
} from '../service/googleSheetsService';
import '../CSS/billing.css';

export default function GoogleSheetsIntegration() {
  const [config, setConfig] = useState(getGoogleSheetsConfig());
  const [webAppUrl, setWebAppUrl] = useState(config.webAppUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);

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
    const updated = saveGoogleSheetsConfig({
      webAppUrl: webAppUrl.trim()
    });
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

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '20px'
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
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: isConnected ? '#e6f4ea' : '#fef7e0',
          border: isConnected ? '1.5px solid #ceead6' : '1.5px solid #feefc3',
          padding: '8px 16px',
          borderRadius: '30px'
        }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isConnected ? '#137333' : '#b06000',
            display: 'inline-block'
          }} />
          <span style={{ fontSize: '12.5px', fontWeight: '700', color: isConnected ? '#137333' : '#b06000' }}>
            {isConnected ? '🟢 Google Sheets जोडले आहे (Live)' : '🟡 स्थानिक डेटाबेस मोड (Local Mode)'}
          </span>
        </div>
      </div>

      {/* Step by step guide card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #dce8de',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <h2 style={{ fontSize: '18px', color: '#176b3a', margin: '0 0 8px', fontWeight: '800' }}>
          🚀 Google Sheets कसे जोडायचे? (Step-by-Step Guide)
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#555' }}>
          खालील ४ सोप्या पायऱ्या फॉलो करून तुमचे स्वतःचे Google Sheet या ॲप्लिकेशनसोबत मोफत कनेक्ट करा:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {/* Step 1 */}
          <div style={{ background: '#f8faf9', border: '1px solid #c2d6c7', borderRadius: '12px', padding: '16px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#176b3a',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '14px',
              marginBottom: '10px'
            }}>
              १
            </div>
            <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#27382d' }}>नवीन Google Sheet बनवा</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#65776d', lineHeight: '1.5' }}>
              तुमच्या Google Drive वर जाऊन एक नवीन Spreadsheet बनवा (उदा. <em>'Swaraj_KSK_Database'</em>).
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ background: '#f8faf9', border: '1px solid #c2d6c7', borderRadius: '12px', padding: '16px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#176b3a',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '14px',
              marginBottom: '10px'
            }}>
              २
            </div>
            <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#27382d' }}>Apps Script उघडा</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#65776d', lineHeight: '1.5' }}>
              Google Sheet मधील मेनू बारमध्ये <strong>Extensions</strong> वर क्लिक करा आणि <strong>Apps Script</strong> निवडा.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ background: '#f8faf9', border: '1px solid #c2d6c7', borderRadius: '12px', padding: '16px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#176b3a',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '14px',
              marginBottom: '10px'
            }}>
              ३
            </div>
            <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#27382d' }}>स्क्रिप्ट पेस्ट करा</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#65776d', lineHeight: '1.5' }}>
              खाली दिलेला संपूर्ण कोड एका क्लिकवर कॉपी करा आणि Apps Script मधील सर्व जुना कोड काढून तिथे पेस्ट करा.
            </p>
          </div>

          {/* Step 4 */}
          <div style={{ background: '#f8faf9', border: '1px solid #c2d6c7', borderRadius: '12px', padding: '16px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#176b3a',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '14px',
              marginBottom: '10px'
            }}>
              ४
            </div>
            <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#27382d' }}>Web App म्हणून Deploy करा</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#65776d', lineHeight: '1.5' }}>
              <strong>Deploy</strong> ➔ <strong>New deployment</strong> ➔ Type: <strong>Web app</strong> ➔ Who has access: <strong>Anyone</strong> निवडून Deploy करा व URL कॉपी करा.
            </p>
          </div>
        </div>

        {/* Connection Form */}
        <div style={{
          background: '#f4f8f5',
          border: '1.5px solid #c8dcd0',
          borderRadius: '14px',
          padding: '20px'
        }}>
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
                flex: 1,
                minWidth: '280px',
                padding: '11px 14px',
                borderRadius: '8px',
                border: '1.5px solid #176b3a',
                fontSize: '13px',
                fontWeight: '600',
                background: '#ffffff'
              }}
            />

            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              style={{
                background: '#176b3a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 18px',
                fontSize: '13px',
                fontWeight: '700',
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
                background: '#2d4b35',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 18px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: isSyncing ? 'not-allowed' : 'pointer'
              }}
            >
              {isSyncing ? '⏳ सिंक होत आहे...' : '🔄 सर्व डेटा शीटमध्ये सिंक करा'}
            </button>
          </div>

          {/* Test connection feedback */}
          {testResult && (
            <div style={{
              background: testResult.success ? '#e6f4ea' : '#fce8e6',
              border: testResult.success ? '1px solid #ceead6' : '1px solid #fad2cf',
              color: testResult.success ? '#137333' : '#c5221f',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '10px'
            }}>
              {testResult.message}
              {testResult.latencyMs && ` (वेळ: ${testResult.latencyMs} ms)`}
            </div>
          )}

          {/* Sync Result feedback */}
          {syncResult && (
            <div style={{
              background: syncResult.success ? '#e6f4ea' : '#fce8e6',
              border: syncResult.success ? '1px solid #ceead6' : '1px solid #fad2cf',
              color: syncResult.success ? '#137333' : '#c5221f',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {syncResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Schema Explanation */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #dce8de',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '17px', color: '#176b3a', fontWeight: '800' }}>
          📑 गुगल शीटमधील आपोआप तयार होणारे टॅब्स (Multiple Tabs in Single Sheet)
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#555' }}>
          एकाच Google Spreadsheet मध्ये खालील ८ स्वतंत्र टॅब्स आपोआप नियंत्रित केले जातात:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ border: '1px solid #e1e8e3', borderRadius: '10px', padding: '12px', background: '#fafcfa' }}>
            <strong style={{ color: '#176b3a', fontSize: '13.5px' }}>1. Stats</strong>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#65776d' }}>
              कॅश्ड आकडेवारी व एकूण काउंट्स. API ला वेग देण्यासाठी स्वतंत्र मेंटेन होते.
            </p>
          </div>

          <div style={{ border: '1px solid #e1e8e3', borderRadius: '10px', padding: '12px', background: '#fafcfa' }}>
            <strong style={{ color: '#176b3a', fontSize: '13.5px' }}>2. Inventory</strong>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#65776d' }}>
              उपलब्ध साठा, खरेदी दर, विक्री दर (MRP) आणि किमान स्टॉक इशारा पातळी.
            </p>
          </div>

          <div style={{ border: '1px solid #e1e8e3', borderRadius: '10px', padding: '12px', background: '#fafcfa' }}>
            <strong style={{ color: '#176b3a', fontSize: '13.5px' }}>3. Purchase_Lots</strong>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#65776d' }}>
              घाऊक खरेदी लॉट नोंदी, सप्लायर नाव, खरेदी संख्या व एकूण किंमत.
            </p>
          </div>

          <div style={{ border: '1px solid #e1e8e3', borderRadius: '10px', padding: '12px', background: '#fafcfa' }}>
            <strong style={{ color: '#176b3a', fontSize: '13.5px' }}>4. Bills</strong>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#65776d' }}>
              डिजिटल बिले, भरलेली रक्कम, उधारी बाकी, पेमेंट प्रकार व मालाची यादी.
            </p>
          </div>

          <div style={{ border: '1px solid #e1e8e3', borderRadius: '10px', padding: '12px', background: '#fafcfa' }}>
            <strong style={{ color: '#176b3a', fontSize: '13.5px' }}>5. Challans</strong>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#65776d' }}>
              डिलिव्हरी चालने, पोच पावत्या, वाहन क्रमांक व मालाचा तपशील.
            </p>
          </div>

          <div style={{ border: '1px solid #e1e8e3', borderRadius: '10px', padding: '12px', background: '#fafcfa' }}>
            <strong style={{ color: '#176b3a', fontSize: '13.5px' }}>6. Customers</strong>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#65776d' }}>
              शेतकरी ग्राहक डिरेक्टरी, एकूण खरेदी, जमा रक्कम आणि उधारी खाते.
            </p>
          </div>

          <div style={{ border: '1px solid #e1e8e3', borderRadius: '10px', padding: '12px', background: '#fafcfa' }}>
            <strong style={{ color: '#176b3a', fontSize: '13.5px' }}>7. Users</strong>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#65776d' }}>
              व्यवस्थापक (Admin), कर्मचारी व शेतकरी युझर्स आयडी व पासवर्ड्स.
            </p>
          </div>

          <div style={{ border: '1px solid #e1e8e3', borderRadius: '10px', padding: '12px', background: '#fafcfa' }}>
            <strong style={{ color: '#176b3a', fontSize: '13.5px' }}>8. Settings</strong>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#65776d' }}>
              दुकानाची माहिती, प्रोप्रायटर नाव, फोन व पत्ता.
            </p>
          </div>
        </div>
      </div>

      {/* Copy Code Box */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #dce8de',
        padding: '24px',
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
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {copyCodeSuccess ? '✓ कोड कॉपी झाला!' : '📋 संपूर्ण कोड कॉपी करा'}
          </button>
        </div>

        <pre style={{
          background: '#1e2421',
          color: '#e4f0e7',
          padding: '16px',
          borderRadius: '10px',
          overflowX: 'auto',
          maxHeight: '380px',
          fontSize: '12px',
          fontFamily: "'Courier New', Courier, monospace",
          lineHeight: '1.45'
        }}>
          {scriptCode}
        </pre>
      </div>
    </div>
  );
}

