import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ChallanTemplate from '../components/ChallanTemplate';
import InventoryProductPicker from '../components/InventoryProductPicker';
import { saveDeliveryChallan, getLiveInventoryItems } from '../service/googleSheetsService';
import { cleanMobileNumber } from '../service/billingService';
import ShopProp from '../config/shopProps';
import '../CSS/billing.css';

export default function CreateChallan() {
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [deductStock, setDeductStock] = useState(true);

  // Items
  const [items, setItems] = useState([
    { id: 1, name: '', qty: 1, unit: 'नग', remark: '' }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [errors, setErrors] = useState({});
  const [inventory, setInventory] = useState([]);

  const challanPrintRef = useRef(null);
  useEffect(() => {
    getLiveInventoryItems().then(setInventory).catch((error) => console.warn('Inventory load error:', error));
  }, []);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSelectProduct = (index, prodName) => {
    const updated = [...items];
    const found = inventory.find((item) => [item.name, item.nameEn].some((value) => String(value || '').trim().toLowerCase() === prodName.trim().toLowerCase()));
    updated[index] = {
      ...updated[index],
      name: found?.name || prodName,
      inventoryId: found?.id || '',
      unit: found?.unit || 'नग'
    };
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { id: Date.now(), name: '', qty: 1, unit: 'नग', remark: '' }]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const validate = () => {
    const err = {};
    if (!customerName.trim()) err.customerName = 'ग्राहकाचे नाव आवश्यक आहे.';
    const clean = cleanMobileNumber(customerMobile);
    if (!clean || clean.length !== 10) err.customerMobile = 'वैध १० अंकी मोबाईल क्रमांक प्रविष्ट करा.';

    const invalidItems = items.some(i => !i.name.trim() || Number(i.qty) <= 0);
    if (invalidItems) err.items = 'सर्व उत्पादनांची नावे व नग संख्या भरणे आवश्यक आहे.';

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSaveAndAction = async (action = 'print') => {
    if (!validate()) return;
    setIsProcessing(true);

    try {
      const now = new Date();
      const YYYYMMDD = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeSec = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
      const challanNo = `CH-${YYYYMMDD}-${timeSec}`;

      const challanData = {
        challanNo,
        date: challanDate,
        customerName: customerName.trim(),
        customerMobile: cleanMobileNumber(customerMobile),
        customerAddress: customerAddress.trim(),
        vehicleNo: vehicleNo.trim(),
        driverName: driverName.trim(),
        remarks: remarks.trim(),
        items,
        deductInventory: deductStock,
        status: 'Dispatched'
      };

      const saved = saveDeliveryChallan(challanData);
      setSuccessInfo(saved);

      if (action === 'pdf' || action === 'print') {
        setTimeout(async () => {
          const el = challanPrintRef.current;
          if (el) {
            const canvas = await html2canvas(el, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

            if (action === 'pdf') {
              pdf.save(`Challan_${saved.challanNo}.pdf`);
            } else {
              pdf.autoPrint();
              window.open(pdf.output('bloburl'), '_blank');
            }
          }
        }, 300);
      }
    } catch (err) {
      console.error('Challan save error:', err);
      alert('चालन जतन करताना त्रुटी आली.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert this challan directly to a bill
  const handleConvertToBill = () => {
    if (!validate()) return;
    const billItems = items.map(i => {
      const found = inventory.find((inv) => inv.id === i.inventoryId || inv.name === i.name);
      const price = Number(found?.sellingPrice || 0);
      return {
        id: Date.now() + Math.random(),
        inventoryId: found?.id || '',
        name: i.name,
        qty: Number(i.qty || 1),
        unit: i.unit || 'नग',
        price: price,
        total: (Number(i.qty || 1) * price)
      };
    });

    // Navigate to Create Bill with prefilled state
    navigate('/admin/billing', {
      state: {
        convertedFromChallan: true,
        customerName,
        customerMobile,
        customerAddress,
        items: billItems,
        notes: `चालन क्र. वरून रूपांतरित (वाहन: ${vehicleNo || '—'})`
      }
    });
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', color: '#176b3a', fontWeight: '800' }}>
            🚚 नवीन डिलिव्हरी चालन (Create Delivery Challan)
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#65776d' }}>
            शेतकऱ्याला माल पाठवण्यासाठी पोच पावती / डिलिव्हरी चालन तयार करा
          </p>
        </div>

        <Link
          to="/admin/challans"
          style={{
            background: '#f0f5f1',
            color: '#176b3a',
            padding: '9px 16px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '700',
            border: '1px solid #c2d6c7'
          }}
        >
          📜 चालन इतिहास पहा
        </Link>
      </div>

      {/* Success Notification */}
      {successInfo && (
        <div style={{
          background: '#e6f4ea',
          border: '1px solid #ceead6',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#137333' }}>
              ✓ चालन क्रमांक {successInfo.challanNo} यशस्वीरीत्या तयार झाले!
            </div>
            <div style={{ fontSize: '12.5px', color: '#334e3b', marginTop: '2px' }}>
              ग्राहक: {successInfo.customerName} ({successInfo.customerMobile}) • {items.length} उत्पादने
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={`https://wa.me/91${cleanMobileNumber(customerMobile)}?text=${encodeURIComponent(
                `नमस्कार ${customerName} जी, स्वराज कृषी सेवा केंद्र कानमंडाळे कडून आपले डिलिव्हरी चालन क्र. ${successInfo.challanNo} जारी करण्यात आले आहे.\n\nवाहन क्र: ${vehicleNo || 'दुकानातून थेट'}\nएकूण नग संख्या: ${items.reduce((s, i) => s + Number(i.qty), 0)}\n\nधन्यवाद! - स्वराज कृषी सेवा केंद्र (8459568940)`
              )}`}
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#25D366',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              💬 WhatsApp वर पाठवा
            </a>

            <button
              type="button"
              onClick={handleConvertToBill}
              style={{
                background: '#176b3a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🧾 या चालनाचे बिल बनवा
            </button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e1e8e3',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#27382d' }}>
              ग्राहकाचे नाव (Customer Name): *
            </label>
            <input
              type="text"
              placeholder="उदा. राहुल पाटील"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.customerName ? '1.5px solid #d93025' : '1px solid #c2d6c7',
                boxSizing: 'border-box'
              }}
            />
            {errors.customerName && <div style={{ color: '#d93025', fontSize: '11px', marginTop: '3px' }}>{errors.customerName}</div>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#27382d' }}>
              मोबाईल नंबर (१० अंकी): *
            </label>
            <input
              type="text"
              maxLength="10"
              placeholder="उदा. 9822012345"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.customerMobile ? '1.5px solid #d93025' : '1px solid #c2d6c7',
                boxSizing: 'border-box'
              }}
            />
            {errors.customerMobile && <div style={{ color: '#d93025', fontSize: '11px', marginTop: '3px' }}>{errors.customerMobile}</div>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#27382d' }}>
              चालन तारीख:
            </label>
            <input
              type="date"
              value={challanDate}
              onChange={(e) => setChallanDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '22px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#27382d' }}>
              पत्ता / गाव / शेत:
            </label>
            <input
              type="text"
              placeholder="उदा. कानमंडाळे, चांदवड"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#27382d' }}>
              वाहन क्रमांक (Vehicle No):
            </label>
            <input
              type="text"
              placeholder="उदा. MH 15 AB 1234 किंवा पिकअप"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#27382d' }}>
              चालक / वाहक नाव:
            </label>
            <input
              type="text"
              placeholder="उदा. ज्ञानेश्वर किंवा स्वतः शेतकरी"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Items Section */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#176b3a', fontWeight: '700' }}>
              📦 पाठवल्या जाणाऱ्या मालाचा तपशील (Goods Dispatched)
            </h3>
            <button
              type="button"
              onClick={addItemRow}
              style={{
                background: '#e8f5e9',
                color: '#176b3a',
                border: '1px solid #c8e6c9',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ➕ नवीन उत्पादन जोडा
            </button>
          </div>

          {errors.items && (
            <div style={{ color: '#d93025', fontSize: '12px', marginBottom: '10px' }}>
              {errors.items}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f4f8f5', textAlign: 'left', borderBottom: '2px solid #dbe6de' }}>
                  <th style={{ padding: '10px', width: '35%' }}>उत्पादनाचे नाव</th>
                  <th style={{ padding: '10px', width: '15%' }}>संख्या (Qty)</th>
                  <th style={{ padding: '10px', width: '15%' }}>युनिट</th>
                  <th style={{ padding: '10px', width: '25%' }}>शेरा / वापर</th>
                  <th style={{ padding: '10px', width: '10%', textAlign: 'center' }}>काढा</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const stockMatch = inventory.find(i => i.id === item.inventoryId || i.name === item.name);
                  const available = stockMatch ? stockMatch.availableStock : null;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #edf2ee' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <InventoryProductPicker
                          inventory={inventory}
                          value={item.name}
                          onChange={(value) => handleSelectProduct(index, value)}
                          placeholder="उत्पादन शोधा..."
                        />
                        {available !== null && (
                          <div style={{ fontSize: '11px', color: available > 5 ? '#137333' : '#b42318', marginTop: '2px' }}>
                            उपलब्ध स्टॉक: <strong>{available} {stockMatch.unit}</strong>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="text"
                          placeholder="उदा. कांदा फवारणी किंवा ठिबक"
                          value={item.remark}
                          onChange={(e) => handleItemChange(index, 'remark', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #c2d6c7', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          style={{ background: '#fce8e6', color: '#c5221f', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Options */}
        <div style={{
          background: '#f8faf9',
          border: '1px solid #e1e8e3',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#176b3a' }}>
            <input
              type="checkbox"
              checked={deductStock}
              onChange={(e) => setDeductStock(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#176b3a' }}
            />
            चालन बनवताना इन्व्हेंटरीमधून स्टॉक वजा करा (Auto-deduct stock)
          </label>

          <div style={{ fontSize: '12px', color: '#65776d' }}>
            एकूण आयटम: <strong>{items.length}</strong> • एकूण संख्या: <strong>{items.reduce((s, i) => s + (Number(i.qty) || 0), 0)}</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleSaveAndAction('print')}
            style={{
              flex: 1,
              minWidth: '200px',
              background: '#176b3a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(23, 107, 58, 0.25)'
            }}
          >
            🖨️ चालन सेव्ह व प्रिंट करा (Print)
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleSaveAndAction('pdf')}
            style={{
              background: '#2d4b35',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            📥 PDF डाउनलोड करा
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConvertToBill}
            style={{
              background: '#e8f5e9',
              color: '#176b3a',
              border: '1.5px solid #176b3a',
              borderRadius: '10px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            🧾 थेट बिलात रूपांतर करा (Convert to Bill)
          </button>
        </div>
      </div>

      {/* Hidden Printable Challan */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <ChallanTemplate
          ref={challanPrintRef}
          challan={{
            challanNo: successInfo?.challanNo || 'CH-PREVIEW',
            date: challanDate,
            customerName,
            customerMobile,
            customerAddress,
            vehicleNo,
            driverName,
            items,
            remarks,
            status: 'Dispatched'
          }}
        />
      </div>
    </div>
  );
}

