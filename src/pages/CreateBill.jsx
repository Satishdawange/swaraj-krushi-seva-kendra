import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import InvoiceTemplate from '../components/InvoiceTemplate';
import {
  generateDigitalBillNumber,
  generatePreviewBillNo,
  cleanMobileNumber,
  saveCustomerBill,
  numberToMarathiWords
} from '../service/billingService';
import '../CSS/billing.css';

export default function CreateBill() {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Customer & Bill State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [billDate, setBillDate] = useState(getTodayDate());
  const [finalGeneratedBillNo, setFinalGeneratedBillNo] = useState(null);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');

  // Purchased items state
  const [items, setItems] = useState([
    { id: 1, name: '', qty: 1, unit: 'नग', price: '', total: 0 }
  ]);

  // Feedback & Generation states
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState(''); // 'pdf' | 'print' | 'save_only'
  const [successInfo, setSuccessInfo] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Hidden print reference
  const invoiceRef = useRef(null);

  // Update item field and line total
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    const qty = Number(field === 'qty' ? value : item.qty) || 0;
    const price = Number(field === 'price' ? value : item.price) || 0;
    item.total = Math.round(qty * price * 100) / 100;

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
      paymentMode,
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

  // Central Unified Handler for Actions: 'pdf' | 'print' | 'save_only'
  const handleExecuteAction = async (type) => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsProcessing(true);
    setActionType(type);
    setSuccessInfo(null);

    // Generate final unique bill number with exact current seconds timestamp
    const finalBillNo = generateDigitalBillNumber(customerName);
    setFinalGeneratedBillNo(finalBillNo);

    const billData = {
      billNo: finalBillNo,
      customerName: customerName.trim(),
      customerMobile: cleanMobileNumber(customerMobile),
      customerAddress: customerAddress.trim(),
      billDate,
      paymentMode,
      notes: notes.trim(),
      items,
      totalAmount
    };

    try {
      // 1. Save lightweight JSON to Supabase customer_bills table (keyed by 10-digit mobile)
      const saveResult = await saveCustomerBill(billData);

      // 2. Perform requested UI action
      if (type === 'pdf') {
        await triggerPdfDownload(billData);
      } else if (type === 'print') {
        window.print();
      }

      setSuccessInfo({
        billNo: billData.billNo,
        customerName: billData.customerName,
        customerMobile: billData.customerMobile,
        totalAmount: billData.totalAmount,
        dbStatus: saveResult?.status || 'saved',
        actionType: type
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

  // Reset Form for Next Bill
  const handleResetForm = () => {
    setCustomerName('');
    setCustomerMobile('');
    setCustomerAddress('');
    setBillDate(getTodayDate());
    setFinalGeneratedBillNo(null);
    setPaymentMode('Cash');
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
          <p>युनिक डिजिटल बिल आयडी, हलका JSON डेटाबेस साठा आणि त्वरित PDF/प्रिंट</p>
        </div>
        <div className="billing-nav-actions">
          <Link to="/admin/bills" className="secondary-btn" style={{ padding: '10px 16px', fontSize: '13px' }}>
            📋 सर्व ग्राहकांची बिले (History)
          </Link>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="secondary-btn"
            style={{ padding: '10px 16px', fontSize: '13px' }}
          >
            👁️ बिल प्रिव्ह्यू (Live Preview)
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
                ✅ बिल यशस्वीरीत्या डेटाबेसमध्ये साठवले गेले!
              </h3>
              <p style={{ margin: '0 0 4px', color: '#274b33', fontSize: '14px' }}>
                डिजिटल बिल क्र.: <strong>{successInfo.billNo}</strong> | ग्राहक: <strong>{successInfo.customerName}</strong> (मो. {successInfo.customerMobile})
              </p>
              <span style={{
                display: 'inline-block',
                background: '#d4ecdc',
                color: '#135c2d',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {successInfo.dbStatus === 'updated_existing_customer'
                  ? '🔄 विद्यमान ग्राहकाच्या खात्यात नवीन बिल JSON जोडले गेले (Appended).'
                  : '✨ नवीन ग्राहकाचा डेटाबेस रेकॉर्ड तयार झाला.'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => triggerPdfDownload(currentBill)}
                className="primary-btn"
                style={{ padding: '9px 16px', fontSize: '13px' }}
              >
                📥 पुन्हा PDF डाऊनलोड करा
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="secondary-btn"
                style={{ padding: '9px 16px', fontSize: '13px' }}
              >
                ➕ नवीन बिल बनवा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Billing Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleExecuteAction('pdf'); }}>
        {/* Customer & Bill Details Card */}
        <div className="billing-card">
          <div className="billing-section-title">
            👤 ग्राहकाची व डिजिटल बिलाची माहिती (Customer & Digital ID)
          </div>

          <div className="billing-grid-3">
            {/* Digital Bill ID (Read Only) */}
            <div className="form-group">
              <label>डिजिटल बिल क्रमांक (Digital Bill ID - Read Only):</label>
              <input
                type="text"
                value={
                  finalGeneratedBillNo
                    ? finalGeneratedBillNo
                    : customerName.trim()
                      ? `${generatePreviewBillNo(customerName)} (सबमिट केल्यावर जनरेट होईल)`
                      : 'SKSK-YYYYMMDD-******-XX (सबमिट केल्यावर जनरेट होईल)'
                }
                readOnly
                style={{
                  background: '#f1f8f3',
                  fontWeight: '700',
                  color: finalGeneratedBillNo ? '#176b3a' : '#496353',
                  fontSize: '13px',
                  letterSpacing: '0.3px',
                  cursor: 'not-allowed',
                  border: '1.5px solid #cedcd1'
                }}
              />
              <small style={{ color: '#688070', fontSize: '10.5px' }}>
                🔒 हा आयडी वाचनीय (Read-only) आहे. सबमिट करताना अचूक सेकंदासह (Seconds Timestamp) डेटाबेसमध्ये सेव्ह होईल.
              </small>
            </div>

            {/* Bill Date */}
            <div className="form-group">
              <label>बिलाची तारीख (Bill Date):</label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>

            {/* Payment Mode */}
            <div className="form-group">
              <label>पेमेंट प्रकार (Payment Mode):</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="Cash">Cash (रोख)</option>
                <option value="UPI / Online">PhonePe / Google Pay / UPI</option>
                <option value="Pending">बाकी (Pending / Credit)</option>
              </select>
            </div>
          </div>

          <div className="billing-grid-2">
            {/* Customer Name */}
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
                <span style={{ color: '#d92d20', fontSize: '12px', marginTop: '2px' }}>
                  {errors.customerName}
                </span>
              )}
            </div>

            {/* Customer Mobile (Without +91 - Primary Key) */}
            <div className="form-group">
              <label>
                मोबाईल क्रमांक (Mobile Number - Primary Key) <span className="required-star">*</span>:
              </label>
              <input
                type="tel"
                placeholder="१० अंकी मोबाईल नंबर (उदा. 9876543210)"
                maxLength={10}
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                required
              />
              <small style={{ color: '#688070', fontSize: '10.5px' }}>
                (+91 शिवाय १० आकडे - डेटाबेस प्रायमरी की)
              </small>
              {errors.customerMobile && (
                <span style={{ color: '#d92d20', fontSize: '12px', marginTop: '2px' }}>
                  {errors.customerMobile}
                </span>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label>
              पत्ता / गाव (Address - ऐच्छिक):
            </label>
            <input
              type="text"
              placeholder="उदा. मु. पो. कानमंडाळे, ता. चांदवड"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Purchased Items Card */}
        <div className="billing-card">
          <div className="billing-section-title">
            🌾 खरेदी मालाचा तपशील (Purchased Items)
          </div>

          {errors.items && (
            <div style={{
              background: '#fef3f2',
              color: '#b42318',
              padding: '10px 14px',
              borderRadius: '10px',
              marginBottom: '14px',
              fontSize: '13px'
            }}>
              ⚠️ {errors.items}
            </div>
          )}

          <div className="table-scroll-hint">
            👉 डावीकडे सरकवून उत्पादनांचे सर्व रकाने (प्रमाण, एकक, दर, रक्कम) भरा
          </div>

          <div className="items-table-wrapper">
            <table className="items-input-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>उत्पादनाचे नाव (Item Name) <span className="required-star">*</span></th>
                  <th style={{ width: '110px' }}>प्रमाण (Qty) <span className="required-star">*</span></th>
                  <th style={{ width: '130px' }}>एकक (Unit)</th>
                  <th style={{ width: '140px' }}>दर प्रति नग ₹ <span className="required-star">*</span></th>
                  <th style={{ width: '140px', textAlign: 'right' }}>रक्कम ₹</th>
                  <th style={{ width: '50px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ textAlign: 'center', color: '#77887e', fontWeight: '600' }}>
                      {index + 1}
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="उदा. युरिया खत ५० किलो / कोराजन"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="1"
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
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="btn-add-item"
            onClick={addItemRow}
          >
            ➕ आणखी उत्पादन जोडा (Add More Item)
          </button>

          {/* Notes */}
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>नोंद / शेरा (Notes - ऐच्छिक):</label>
            <input
              type="text"
              placeholder="उदा. बियाणे लॉट नंबर, किंवा अतिरिक्त माहिती"
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
          <div className="grand-total-box">
            <span>एकूण देय रक्कम (Grand Total):</span>
            <strong>₹ {Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

        {/* Explicit Storage Warning Notice */}
        <div style={{
          background: '#fff9e6',
          border: '1.5px solid #ffe17d',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#7a5a00',
          fontSize: '13px',
          lineHeight: '1.5'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>
            <strong>सूचना (Storage Notice):</strong> खालीलपैकी कोणत्याही बटणावर क्लिक केल्यावर या बिलाची डिजिटल नोंद Supabase डेटाबेस स्टोरेजमध्ये (ग्राहकाच्या मोबाईल क्रमांकाखाली JSON स्वरूपात) कायमस्वरूपी सुरक्षित जमा केली जाईल.
          </span>
        </div>

        {/* 3 Main Action Buttons on Main Page */}
        <div className="billing-actions">
          <button
            type="button"
            className="btn-reset"
            onClick={handleResetForm}
            disabled={isProcessing}
          >
            🔄 रीसेट करा (Reset)
          </button>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {/* Button 3: Save Data Only */}
            <button
              type="button"
              className="secondary-btn"
              onClick={() => handleExecuteAction('save_only')}
              disabled={isProcessing}
              style={{ padding: '13px 18px', fontSize: '14px', borderColor: '#176b3a' }}
            >
              {isProcessing && actionType === 'save_only' ? '⏳ साठवत आहे...' : '💾 फक्त डेटा सेव्ह करा'}
            </button>

            {/* Button 2: Direct Print & Save */}
            <button
              type="button"
              className="secondary-btn"
              onClick={() => handleExecuteAction('print')}
              disabled={isProcessing}
              style={{ padding: '13px 18px', fontSize: '14px', background: '#eaf5eb', color: '#176b3a' }}
            >
              {isProcessing && actionType === 'print' ? '⏳ प्रिंट तयार होत आहे...' : '🖨️ थेट प्रिंट व सेव्ह करा'}
            </button>

            {/* Button 1: Download PDF & Save */}
            <button
              type="button"
              className="btn-generate-pdf"
              onClick={() => handleExecuteAction('pdf')}
              disabled={isProcessing}
            >
              {isProcessing && actionType === 'pdf' ? (
                <>⏳ PDF तयार व सेव्ह होत आहे...</>
              ) : (
                <>📥 PDF डाऊनलोड व सेव्ह करा</>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Hidden Offscreen Container for html2canvas */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
        <InvoiceTemplate ref={invoiceRef} bill={currentBill} />
      </div>

      {/* Preview Modal with Enhanced Buttons and Warning */}
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

            {/* Warning inside modal */}
            <div style={{
              background: '#fff9e6',
              borderTop: '1px solid #ffe17d',
              borderBottom: '1px solid #ffe17d',
              padding: '10px 20px',
              fontSize: '12px',
              color: '#7a5a00',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>बटणावर क्लिक केल्यास हा डेटा थेट Supabase डेटाबेसमध्ये सेव्ह केला जाईल.</span>
            </div>

            <div className="invoice-modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setPreviewOpen(false)}
                style={{ padding: '10px 16px', fontSize: '13px' }}
              >
                रद्द करा (Close)
              </button>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* Modal Button 3: Save Only */}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => handleExecuteAction('save_only')}
                  disabled={isProcessing}
                  style={{ padding: '10px 16px', fontSize: '13px' }}
                >
                  {isProcessing && actionType === 'save_only' ? '⏳ साठवत आहे...' : '💾 फक्त डेटा सेव्ह करा'}
                </button>

                {/* Modal Button 2: Print & Save */}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => handleExecuteAction('print')}
                  disabled={isProcessing}
                  style={{ padding: '10px 16px', fontSize: '13px', background: '#eaf5eb', color: '#176b3a' }}
                >
                  {isProcessing && actionType === 'print' ? '⏳ प्रिंट तयार होत आहे...' : '🖨️ थेट प्रिंट व सेव्ह'}
                </button>

                {/* Modal Button 1: Download PDF & Save */}
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handleExecuteAction('pdf')}
                  disabled={isProcessing}
                  style={{ padding: '10px 18px', fontSize: '13px' }}
                >
                  {isProcessing && actionType === 'pdf' ? '⏳ डाउनलोड होत आहे...' : '📥 PDF डाऊनलोड व सेव्ह'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
