import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import InvoiceTemplate from '../components/InvoiceTemplate';
import {
  generateDigitalBillNumber,
  generatePreviewBillNo,
  cleanMobileNumber,
  numberToMarathiWords,
  saveCustomerBill
} from '../service/billingService';
import {
  getAllInventoryItems,
  saveBillWithInventoryDeduction
} from '../service/googleSheetsService';
import ShopProp from '../config/shopProps';
import '../CSS/billing.css';

export default function CreateBill() {
  const location = useLocation();
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Customer & Bill State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [billDate, setBillDate] = useState(getTodayDate());
  const [finalGeneratedBillNo, setFinalGeneratedBillNo] = useState(null);

  // Enhanced Payment Status & Options
  const [paymentStatus, setPaymentStatus] = useState('Fully Paid'); // 'Fully Paid' | 'Half Paid' | 'Not Paid'
  const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash' | 'UPI / Online' | 'Bank' | 'Credit'
  const [customPaidAmount, setCustomPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Purchased items state
  const [items, setItems] = useState([
    { id: 1, name: '', qty: 1, unit: 'नग', price: '', total: 0 }
  ]);

  // Inventory list for live stock check
  const [inventory, setInventory] = useState([]);

  // Feedback & Generation states
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const invoiceRef = useRef(null);

  // Load inventory on mount
  useEffect(() => {
    try {
      const itemsList = getAllInventoryItems();
      setInventory(itemsList);
    } catch (e) {
      console.warn('Inventory load error:', e);
    }
  }, []);

  // Prepopulate if redirected from Challan conversion
  useEffect(() => {
    if (location.state?.convertedFromChallan) {
      if (location.state.customerName) setCustomerName(location.state.customerName);
      if (location.state.customerMobile) setCustomerMobile(location.state.customerMobile);
      if (location.state.customerAddress) setCustomerAddress(location.state.customerAddress);
      if (location.state.notes) setNotes(location.state.notes);
      if (Array.isArray(location.state.items) && location.state.items.length > 0) {
        setItems(location.state.items);
      }
    }
  }, [location.state]);

  // Handle item changes
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    const qty = Number(field === 'qty' ? value : item.qty) || 0;
    const price = Number(field === 'price' ? value : item.price) || 0;
    item.total = Math.round(qty * price * 100) / 100;

    updated[index] = item;
    setItems(updated);
  };

  // When product name is selected, auto-fill unit, price & show stock
  const handleSelectProduct = (index, name) => {
    const matched = inventory.find(i => i.name === name);
    const updated = [...items];
    const item = { ...updated[index], name };

    if (matched) {
      item.unit = matched.unit || 'नग';
      if (matched.sellingPrice) {
        item.price = matched.sellingPrice;
        item.total = Math.round((Number(item.qty || 1) * Number(matched.sellingPrice)) * 100) / 100;
      }
    }

    updated[index] = item;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { id: Date.now(), name: '', qty: 1, unit: 'नग', price: '', total: 0 }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) {
      alert('बिलामध्ये किमान एक उत्पादन असणे आवश्यक आहे.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  // Calculate Paid and Balance based on Payment Status
  const getPaidAndBalance = () => {
    if (paymentStatus === 'Fully Paid') {
      return { paid: totalAmount, balance: 0 };
    } else if (paymentStatus === 'Not Paid') {
      return { paid: 0, balance: totalAmount };
    } else {
      // Half Paid
      const entered = Number(customPaidAmount) || 0;
      const validPaid = Math.min(totalAmount, Math.max(0, entered));
      return { paid: validPaid, balance: Math.max(0, totalAmount - validPaid) };
    }
  };

  const { paid: paidAmount, balance: balanceAmount } = getPaidAndBalance();

  // Form Validation
  const validateForm = () => {
    const newErrors = {};
    const cleanMobile = cleanMobileNumber(customerMobile);

    if (!customerName.trim()) {
      newErrors.customerName = 'ग्राहकाचे नाव आवश्यक आहे.';
    }

    if (!cleanMobile) {
      newErrors.customerMobile = 'मोबाईल क्रमांक आवश्यक आहे.';
    } else if (cleanMobile.length !== 10) {
      newErrors.customerMobile = 'कृपया वैध १० अंकी मोबाईल क्रमांक टाका (+91 शिवाय).';
    }

    const invalidItems = items.some(
      (item) => !item.name.trim() || Number(item.price) <= 0 || Number(item.qty) <= 0
    );
    if (invalidItems) {
      newErrors.items = 'सर्व उत्पादनांचे नाव, प्रमाण आणि दर (किंमत) भरणे आवश्यक आहे.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Compile current bill object
  const getCurrentBillData = () => {
    const activeBillNo = finalGeneratedBillNo || generatePreviewBillNo(customerName);
    return {
      billNo: activeBillNo,
      customerName: customerName.trim(),
      customerMobile: cleanMobileNumber(customerMobile),
      customerAddress: customerAddress.trim(),
      billDate,
      paymentStatus,
      paymentMode,
      paidAmount,
      balanceAmount,
      dueDate,
      notes: notes.trim(),
      items,
      totalAmount
    };
  };

  // Trigger PDF file generation & download
  const triggerPdfDownload = async (billData) => {
    if (!invoiceRef.current) return false;
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    const safeCustomer = (billData.customerName || 'Customer').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
    pdf.save(`Swaraj_Bill_${billData.billNo}_${safeCustomer}.pdf`);
    return true;
  };

  // Send WhatsApp message to customer with full bill breakdown
  const handleSendWhatsApp = (billData) => {
    const clean = cleanMobileNumber(billData.customerMobile);
    if (!clean || clean.length !== 10) {
      alert('कृपया वैध १० अंकी ग्राहक मोबाईल नंबर भरा.');
      return;
    }

    const itemsSummary = billData.items.map((i, idx) => `${idx + 1}. ${i.name} - ${i.qty} ${i.unit || 'नग'} @ ₹${i.price} = ₹${i.total}`).join('\n');

    const paymentText = billData.paymentStatus === 'Fully Paid'
      ? `✅ पूर्ण भरणा: ₹${billData.totalAmount}`
      : (billData.paymentStatus === 'Half Paid'
        ? `⚠️ अंशतः भरणा: जमा ₹${billData.paidAmount} | शिल्लक बाकी उधारी: ₹${billData.balanceAmount}`
        : `⚠️ उधारी बिल: पूर्ण ₹${billData.totalAmount} बाकी`);

    const message = `🌾 *स्वराज कृषी सेवा केंद्र, कानमंडाळे* 🌾
(खते, बी-बियाणे, कीटकनाशके व कृषी सल्ला)

नमस्कार *${billData.customerName}* जी,
आपले खरेदी बिल खालीलप्रमाणे जारी करण्यात आले आहे:

📄 *बिल क्रमांक:* ${billData.billNo}
📅 *तारीख:* ${billData.billDate}
💳 *पेमेंट पद्धत:* ${billData.paymentMode}

📦 *मालाचा तपशील:*
${itemsSummary}

💰 *एकूण रक्कम:* ₹ ${Number(billData.totalAmount).toLocaleString('en-IN')}
💵 *पेमेंट स्थिती:* ${paymentText}
${billData.dueDate ? `🗓️ *उधारी जमा तारीख:* ${billData.dueDate}\n` : ''}
${billData.notes ? `📝 *नोंद:* ${billData.notes}\n` : ''}
आपण या बिलाची अधिकृत प्रत आमच्या वेबसाईटवरील ग्राहक पोर्टलवरून कधीही डाऊनलोड करू शकता.

आपल्या शेतीविषयक औषधांचे पाण्याचे प्रमाण व डोस विचारण्यासाठी आमच्या AI कृषी मित्राशी संपर्क साधा!
📞 संपर्क: निलेश त्र्यंबक दवंगे (+91 8459568940)
धन्यवाद! 🙏`;

    const waUrl = `https://wa.me/91${clean}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Unified Handler: Save to Google Sheets (with Inventory Deduction) + Supabase + Action
  const handleExecuteAction = async (type) => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsProcessing(true);
    setActionType(type);
    setSuccessInfo(null);

    const finalBillNo = generateDigitalBillNumber(customerName);
    setFinalGeneratedBillNo(finalBillNo);

    const billData = {
      billNo: finalBillNo,
      customerName: customerName.trim(),
      customerMobile: cleanMobileNumber(customerMobile),
      customerAddress: customerAddress.trim(),
      billDate,
      paymentStatus,
      paymentMode,
      paidAmount,
      balanceAmount,
      dueDate,
      notes: notes.trim(),
      items,
      totalAmount
    };

    try {
      // 1. Save with live inventory deduction in Google Sheets & Local DB
      saveBillWithInventoryDeduction(billData);

      // 2. Also save to Supabase customer_bills table if configured
      await saveCustomerBill(billData).catch((e) => console.warn('Supabase save optional:', e));

      // Refresh local inventory view
      setInventory(getAllInventoryItems());

      // 3. Execute requested action
      if (type === 'pdf') {
        await triggerPdfDownload(billData);
      } else if (type === 'print') {
        window.print();
      } else if (type === 'whatsapp') {
        handleSendWhatsApp(billData);
      }

      setSuccessInfo({
        billNo: billData.billNo,
        customerName: billData.customerName,
        customerMobile: billData.customerMobile,
        totalAmount: billData.totalAmount,
        paidAmount: billData.paidAmount,
        balanceAmount: billData.balanceAmount,
        paymentStatus: billData.paymentStatus,
        billData
      });

      if (previewOpen) {
        setPreviewOpen(false);
      }
    } catch (err) {
      console.error('Error during bill processing:', err);
      alert('प्रक्रियेदरम्यान अडचण आली: ' + err.message);
    } finally {
      setIsProcessing(false);
      setActionType('');
    }
  };

  const handleResetForm = () => {
    setCustomerName('');
    setCustomerMobile('');
    setCustomerAddress('');
    setBillDate(getTodayDate());
    setFinalGeneratedBillNo(null);
    setPaymentStatus('Fully Paid');
    setPaymentMode('Cash');
    setCustomPaidAmount('');
    setDueDate('');
    setNotes('');
    setItems([{ id: Date.now(), name: '', qty: 1, unit: 'नग', price: '', total: 0 }]);
    setErrors({});
    setSuccessInfo(null);
  };

  const currentBill = getCurrentBillData();

  return (
    <div className="billing-page">
      {/* Header */}
      <div className="billing-header">
        <div>
          <h1>🧾 नवीन डिजिटल बिल (Create Digital Bill)</h1>
          <p>ऑटो-स्टॉक डिडक्शन, मल्टिपल पेमेंट पर्याय (पूर्ण/अंशतः/उधारी) व थेट WhatsApp शेअर</p>
        </div>
        <div className="billing-nav-actions">
          <Link to="/admin/bills" className="secondary-btn" style={{ padding: '10px 16px', fontSize: '13px' }}>
            📋 सर्व बिले (History)
          </Link>
          <Link to="/admin/challan/create" className="secondary-btn" style={{ padding: '10px 16px', fontSize: '13px' }}>
            🚚 चालन बनवा
          </Link>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="secondary-btn"
            style={{ padding: '10px 16px', fontSize: '13px' }}
          >
            👁️ प्रिव्ह्यू (Preview)
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successInfo && (
        <div style={{
          background: '#eaf6ee',
          border: '2px solid #22a35a',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '28px',
          boxShadow: '0 8px 24px rgba(34, 163, 90, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px', color: '#134023', fontSize: '18px' }}>
                ✅ बिल यशस्वीरीत्या डेटाबेसमध्ये साठवले गेले व इन्व्हेंटरी स्टॉक अपडेट झाला!
              </h3>
              <p style={{ margin: '0 0 4px', color: '#274b33', fontSize: '14px' }}>
                बिल क्र.: <strong>{successInfo.billNo}</strong> | ग्राहक: <strong>{successInfo.customerName}</strong> (मो. {successInfo.customerMobile})
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <span style={{ background: '#d4ecdc', color: '#135c2d', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                  एकूण: ₹ {successInfo.totalAmount}
                </span>
                <span style={{ background: successInfo.balanceAmount > 0 ? '#fef7e0' : '#d4ecdc', color: successInfo.balanceAmount > 0 ? '#b06000' : '#135c2d', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                  {successInfo.balanceAmount > 0 ? `शिल्लक बाकी उधारी: ₹ ${successInfo.balanceAmount}` : 'पूर्ण भरणा ✓'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleSendWhatsApp(successInfo.billData)}
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                💬 WhatsApp वर पाठवा
              </button>

              <button
                type="button"
                onClick={() => triggerPdfDownload(currentBill)}
                className="primary-btn"
                style={{ padding: '9px 16px', fontSize: '13px' }}
              >
                📥 पुन्हा PDF डाऊनलोड
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="secondary-btn"
                style={{ padding: '9px 16px', fontSize: '13px' }}
              >
                ➕ पुढील नवीन बिल
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleExecuteAction('pdf'); }}>
        {/* Customer Details Card */}
        <div className="billing-card">
          <div className="billing-section-title">
            👤 ग्राहकाची व बिलाची माहिती (Customer & Bill Info)
          </div>

          <div className="billing-grid-3">
            <div className="form-group">
              <label>डिजिटल बिल क्रमांक (Digital Bill ID - Read Only):</label>
              <input
                type="text"
                value={
                  finalGeneratedBillNo
                    ? finalGeneratedBillNo
                    : customerName.trim()
                      ? `${generatePreviewBillNo(customerName)} (सबमिट केल्यावर निश्चित होईल)`
                      : 'SKSK-YYYYMMDD-******-XX (सबमिट केल्यावर निश्चित होईल)'
                }
                readOnly
                style={{
                  background: '#f1f8f3',
                  fontWeight: '700',
                  color: finalGeneratedBillNo ? '#176b3a' : '#496353',
                  fontSize: '13px',
                  cursor: 'not-allowed',
                  border: '1.5px solid #cedcd1'
                }}
              />
            </div>

            <div className="form-group">
              <label>बिलाची तारीख (Bill Date):</label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>पेमेंट पद्धत (Payment Mode):</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="Cash">Cash (रोख)</option>
                <option value="PhonePe / UPI">PhonePe / Google Pay (UPI)</option>
                <option value="Bank Transfer">Bank NEFT / RTGS</option>
                <option value="Credit">उधारी खाते (Credit)</option>
              </select>
            </div>
          </div>

          <div className="billing-grid-2">
            <div className="form-group">
              <label>
                ग्राहकाचे नाव (Customer Name) <span className="required-star">*</span>:
              </label>
              <input
                type="text"
                placeholder="उदा. राहुल शिवाजी पाटील (Rahul Patil)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
              {errors.customerName && (
                <span style={{ color: '#d92d20', fontSize: '12px' }}>{errors.customerName}</span>
              )}
            </div>

            <div className="form-group">
              <label>
                मोबाईल क्रमांक (Mobile Number) <span className="required-star">*</span>:
              </label>
              <input
                type="tel"
                placeholder="१० अंकी मोबाईल नंबर (उदा. 9822012345)"
                maxLength={10}
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                required
              />
              {errors.customerMobile && (
                <span style={{ color: '#d92d20', fontSize: '12px' }}>{errors.customerMobile}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>पत्ता / गाव (Address):</label>
            <input
              type="text"
              placeholder="उदा. मु. पो. कानमंडाळे, ता. चांदवड, जि. नाशिक"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Purchased Items Card with Live Stock Lookup */}
        <div className="billing-card">
          <div className="billing-section-title">
            🌾 खरेदी मालाचा तपशील व इन्व्हेंटरी स्टॉक (Purchased Items & Stock)
          </div>

          {errors.items && (
            <div style={{ background: '#fef3f2', color: '#b42318', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '13px' }}>
              ⚠️ {errors.items}
            </div>
          )}

          <div className="items-table-wrapper">
            <table className="items-input-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>उत्पादनाचे नाव (Item Name) <span className="required-star">*</span></th>
                  <th style={{ width: '120px' }}>प्रमाण (Qty) <span className="required-star">*</span></th>
                  <th style={{ width: '130px' }}>एकक (Unit)</th>
                  <th style={{ width: '140px' }}>दर प्रति नग ₹ <span className="required-star">*</span></th>
                  <th style={{ width: '140px', textAlign: 'right' }}>रक्कम ₹</th>
                  <th style={{ width: '50px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const matched = inventory.find(i => i.name === item.name);
                  const available = matched ? Number(matched.availableStock) : null;
                  const isStockShortage = available !== null && Number(item.qty || 1) > available;

                  return (
                    <tr key={item.id || index}>
                      <td style={{ textAlign: 'center', color: '#77887e', fontWeight: '600' }}>
                        {index + 1}
                      </td>
                      <td>
                        <input
                          type="text"
                          list="product-stock-options"
                          placeholder="उत्पादन निवडा किंवा टाईप करा..."
                          value={item.name}
                          onChange={(e) => handleSelectProduct(index, e.target.value)}
                          required
                        />
                        {available !== null && (
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            marginTop: '2px',
                            color: isStockShortage ? '#d93025' : '#137333'
                          }}>
                            {isStockShortage
                              ? `⚠️ साठा अपुरा! (उपलब्ध: फक्त ${available} ${matched.unit})`
                              : `✓ उपलब्ध साठा: ${available} ${matched.unit}`}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        >
                          <option value="नग">नग (Nos)</option>
                          <option value="बॅग">बॅग (Bag)</option>
                          <option value="लिटर">लिटर (Litre)</option>
                          <option value="मि.ली.">मि.ली. (ml)</option>
                          <option value="किलो">किलो (Kg)</option>
                          <option value="ग्रॅम">ग्रॅम (Gram)</option>
                          <option value="बाटली">बाटली (Bottle)</option>
                          <option value="पॅकेट">पॅकेट (Packet)</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="दर ₹"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          required
                        />
                      </td>
                      <td className="line-total-cell">
                        ₹ {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-remove-row"
                          onClick={() => removeItemRow(index)}
                          title="उत्पादन काढा"
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

          <datalist id="product-stock-options">
            {inventory.map((inv, idx) => (
              <option key={idx} value={inv.name}>
                [स्टॉक: {inv.availableStock} {inv.unit}] - ₹{inv.sellingPrice}
              </option>
            ))}
          </datalist>

          <button
            type="button"
            className="btn-add-item"
            onClick={addItemRow}
          >
            ➕ आणखी उत्पादन जोडा (Add Item)
          </button>
        </div>

        {/* Payment Status & Credit Option Card */}
        <div className="billing-card" style={{ background: '#f8faf9', border: '1.5px solid #c8dcd0' }}>
          <div className="billing-section-title" style={{ color: '#176b3a' }}>
            💳 पेमेंट पर्याय (Payment Status: पूर्ण / अंशतः / उधारी)
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '18px'
          }}>
            <button
              type="button"
              onClick={() => setPaymentStatus('Fully Paid')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: paymentStatus === 'Fully Paid' ? '2px solid #137333' : '1px solid #c2d6c7',
                background: paymentStatus === 'Fully Paid' ? '#e6f4ea' : '#ffffff',
                color: paymentStatus === 'Fully Paid' ? '#137333' : '#333333',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '14px' }}>🟢 पूर्ण भरणा (Fully Paid)</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>१००% रक्कम रोख किंवा ऑनलाइन जमा</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentStatus('Half Paid')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: paymentStatus === 'Half Paid' ? '2px solid #b06000' : '1px solid #c2d6c7',
                background: paymentStatus === 'Half Paid' ? '#fef7e0' : '#ffffff',
                color: paymentStatus === 'Half Paid' ? '#b06000' : '#333333',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '14px' }}>🟡 अंशतः भरणा (Half / Advance)</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>काही रक्कम जमा, बाकी रक्कम उधारी</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentStatus('Not Paid')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: paymentStatus === 'Not Paid' ? '2px solid #c5221f' : '1px solid #c2d6c7',
                background: paymentStatus === 'Not Paid' ? '#fce8e6' : '#ffffff',
                color: paymentStatus === 'Not Paid' ? '#c5221f' : '#333333',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '14px' }}>🔴 पूर्ण उधारी (Not Paid / Credit)</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>रक्कम जमा नाही, पूर्ण रक्कम उधारी</div>
            </button>
          </div>

          {/* Conditional Inputs for Half Paid / Advance */}
          {paymentStatus === 'Half Paid' && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #ffe17d',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#137333', marginBottom: '6px' }}>
                  आत्ता जमा झालेली रक्कम (Paid Amount ₹): *
                </label>
                <input
                  type="number"
                  min="1"
                  max={totalAmount}
                  placeholder="उदा. 2000"
                  value={customPaidAmount}
                  onChange={(e) => setCustomPaidAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #137333', fontWeight: '700' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#b42318', marginBottom: '6px' }}>
                  शिल्लक येणे बाकी उधारी (Balance Udhaari ₹):
                </label>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#b42318', padding: '8px 0' }}>
                  ₹ {balanceAmount.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#27382d', marginBottom: '6px' }}>
                  उधारी जमा दिनांक (Due Date - ऐच्छिक):
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c2d6c7' }}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="form-group" style={{ margin: 0 }}>
            <label>नोंद / शेरा (Notes):</label>
            <input
              type="text"
              placeholder="उदा. उधारी शेरा, फवारणी सूचना, किंवा बियाणे लॉट नंबर"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Summary Card */}
        <div className="billing-summary-card">
          <div className="summary-details">
            <span className="summary-label">अक्षरी एकूण रक्कम:</span>
            <span className="summary-words">{numberToMarathiWords(totalAmount)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#555' }}>
              एकूण रक्कम: <strong>₹ {Number(totalAmount).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#137333', fontWeight: '700' }}>
              जमा रक्कम: ₹ {Number(paidAmount).toLocaleString('en-IN')}
            </div>
            {balanceAmount > 0 && (
              <div style={{ fontSize: '15px', color: '#b42318', fontWeight: '800' }}>
                शिल्लक उधारी: ₹ {Number(balanceAmount).toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="billing-actions" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <button
            type="button"
            className="btn-reset"
            onClick={handleResetForm}
            disabled={isProcessing}
          >
            🔄 रीसेट करा
          </button>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={() => handleExecuteAction('whatsapp')}
              disabled={isProcessing}
              style={{
                background: '#25D366',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 18px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              💬 सेव्ह व WhatsApp वर पाठवा
            </button>

            {/* Print & Save */}
            <button
              type="button"
              className="secondary-btn"
              onClick={() => handleExecuteAction('print')}
              disabled={isProcessing}
              style={{ padding: '12px 18px', fontSize: '14px', background: '#eaf5eb', color: '#176b3a' }}
            >
              🖨️ प्रिंट व सेव्ह
            </button>

            {/* Download PDF & Save */}
            <button
              type="button"
              className="btn-generate-pdf"
              onClick={() => handleExecuteAction('pdf')}
              disabled={isProcessing}
            >
              📥 PDF डाऊनलोड व सेव्ह
            </button>
          </div>
        </div>
      </form>

      {/* Hidden Offscreen Container for html2canvas */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
        <InvoiceTemplate ref={invoiceRef} bill={currentBill} />
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="invoice-modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="invoice-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-modal-header">
              <h3>📄 पावती प्रिव्ह्यू: {currentBill.billNo}</h3>
              <button
                onClick={() => setPreviewOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#556b5a' }}
              >
                ✕
              </button>
            </div>

            <div className="invoice-modal-body">
              <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                <InvoiceTemplate bill={currentBill} />
              </div>
            </div>

            <div className="invoice-modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setPreviewOpen(false)}
                style={{ padding: '10px 16px', fontSize: '13px' }}
              >
                बंद करा
              </button>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleExecuteAction('whatsapp')}
                  disabled={isProcessing}
                  style={{
                    background: '#25D366',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  💬 WhatsApp शेअर
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => handleExecuteAction('print')}
                  disabled={isProcessing}
                  style={{ padding: '10px 16px', fontSize: '13px' }}
                >
                  🖨️ थेट प्रिंट
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handleExecuteAction('pdf')}
                  disabled={isProcessing}
                  style={{ padding: '10px 18px', fontSize: '13px' }}
                >
                  📥 PDF डाऊनलोड
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
