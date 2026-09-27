import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import InvoiceTemplate from '../components/InvoiceTemplate';
import {
  getAllCustomerBills,
  updateCustomerBill,
  cleanMobileNumber,
  numberToMarathiWords
} from '../service/billingService';
import '../CSS/billing.css';

export default function BillHistory() {
  const [bills, setBills] = useState([]);
  const [customerRows, setCustomerRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Bill & Viewer State
  const [activeBill, setActiveBill] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewActivityLog, setViewActivityLog] = useState(false);

  // Edit Form State (when in Red Update Mode)
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editBillDate, setEditBillDate] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState('Cash');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [editErrors, setEditErrors] = useState({});

  // Action status
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const historyInvoiceRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { allBills, customerRows: rows } = await getAllCustomerBills();
      setBills(allBills || []);
      setCustomerRows(rows || []);
    } catch (err) {
      console.error('Error fetching bills history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter bills
  const filteredBills = bills.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.customerMobile || '').includes(q) ||
      (b.billNo || '').toLowerCase().includes(q)
    );
  });

  // Open Bill in View Mode
  const handleOpenBill = (bill) => {
    setActiveBill(bill);
    setIsEditMode(false);
    setViewActivityLog(false);
    setUpdateSuccess(false);
    setModalOpen(true);
  };

  // Switch to Red Edit Mode & populate fields
  const handleStartEditing = () => {
    if (!activeBill) return;
    setEditCustomerName(activeBill.customerName || '');
    setEditCustomerAddress(activeBill.customerAddress || '');
    setEditBillDate(activeBill.billDate || new Date().toISOString().split('T')[0]);
    setEditPaymentMode(activeBill.paymentMode || 'Cash');
    setEditNotes(activeBill.notes || '');

    // Clone items
    const clonedItems = Array.isArray(activeBill.items)
      ? activeBill.items.map((item, idx) => ({
          id: item.id || Date.now() + idx,
          name: item.name || '',
          qty: item.qty || 1,
          unit: item.unit || 'नग',
          price: item.price || 0,
          total: item.total || (item.qty || 1) * (item.price || 0)
        }))
      : [{ id: Date.now(), name: '', qty: 1, unit: 'नग', price: 0, total: 0 }];

    setEditItems(clonedItems);
    setEditErrors({});
    setIsEditMode(true);
    setUpdateSuccess(false);
  };

  // Edit item rows
  const handleEditItemChange = (index, field, value) => {
    const updated = [...editItems];
    const item = { ...updated[index], [field]: value };
    const qty = Number(field === 'qty' ? value : item.qty) || 0;
    const price = Number(field === 'price' ? value : item.price) || 0;
    item.total = Math.round(qty * price * 100) / 100;
    updated[index] = item;
    setEditItems(updated);
  };

  const addEditItemRow = () => {
    setEditItems([
      ...editItems,
      { id: Date.now(), name: '', qty: 1, unit: 'नग', price: '', total: 0 }
    ]);
  };

  const removeEditItemRow = (index) => {
    if (editItems.length <= 1) {
      alert('किमान एक उत्पादन असणे आवश्यक आहे.');
      return;
    }
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  // Calculate updated total amount
  const editTotalAmount = editItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  // Validate edit inputs
  const validateEditForm = () => {
    const errs = {};
    if (!editCustomerName.trim()) {
      errs.customerName = 'ग्राहकाचे नाव आवश्यक आहे.';
    }
    const invalidItems = editItems.some(
      (item) => !item.name.trim() || Number(item.price) <= 0 || Number(item.qty) <= 0
    );
    if (invalidItems) {
      errs.items = 'सर्व उत्पादनांचे नाव, प्रमाण आणि दर भरणे आवश्यक आहे.';
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Direct PDF generation helper
  const triggerPdfDownload = async (billData) => {
    if (!historyInvoiceRef.current) return false;
    const canvas = await html2canvas(historyInvoiceRef.current, {
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

  // Execute Red Update Actions: 'update_pdf' | 'update_print' | 'update_save_only'
  const handleExecuteUpdate = async (type) => {
    if (!validateEditForm()) return;

    setIsProcessing(true);
    setActionType(type);

    const updatedBill = {
      ...activeBill,
      customerName: editCustomerName.trim(),
      customerAddress: editCustomerAddress.trim(),
      billDate: editBillDate,
      paymentMode: editPaymentMode,
      notes: editNotes.trim(),
      items: editItems,
      totalAmount: editTotalAmount,
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Update in Supabase customer_bills and local backup
      await updateCustomerBill(activeBill.billNo, updatedBill);

      // 2. Update local state
      setActiveBill(updatedBill);
      setBills((prev) =>
        prev.map((b) => (b.billNo === activeBill.billNo ? updatedBill : b))
      );

      // 3. Trigger action
      if (type === 'update_pdf') {
        setTimeout(async () => {
          await triggerPdfDownload(updatedBill);
        }, 100);
      } else if (type === 'update_print') {
        setTimeout(() => {
          window.print();
        }, 100);
      }

      setUpdateSuccess(true);
      setIsEditMode(false);
    } catch (err) {
      console.error('Update error:', err);
      alert('बिल अपडेट करताना त्रुटी आली: ' + err.message);
    } finally {
      setIsProcessing(false);
      setActionType('');
    }
  };

  return (
    <div className="billing-page">
      {/* Header */}
      <div className="billing-header">
        <div>
          <h1>📋 ग्राहकांची बिले (Customer Bills Database)</h1>
          <p>बिल पहा, प्रिंट करा किंवा आवश्यक असल्यास लाल संपादन मोडमध्ये बिल अपडेट करा</p>
        </div>
        <div className="billing-nav-actions">
          <button
            onClick={loadData}
            className="secondary-btn"
            style={{ padding: '10px 16px', fontSize: '13px' }}
          >
            🔄 रीफ्रेश करा
          </button>
          <Link to="/admin/billing" className="primary-btn" style={{ padding: '10px 18px', fontSize: '13px' }}>
            ➕ नवीन बिल बनवा
          </Link>
        </div>
      </div>

      {/* Database Metric Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #d8e5db',
          borderRadius: '14px',
          padding: '16px 20px',
          boxShadow: '0 4px 15px rgba(24, 68, 43, 0.04)'
        }}>
          <span style={{ fontSize: '12px', color: '#627c6b', fontWeight: '600' }}>एकूण ग्राहक (Unique Customers)</span>
          <strong style={{ display: 'block', fontSize: '26px', color: '#176b3a', marginTop: '4px' }}>
            {customerRows.length}
          </strong>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #d8e5db',
          borderRadius: '14px',
          padding: '16px 20px',
          boxShadow: '0 4px 15px rgba(24, 68, 43, 0.04)'
        }}>
          <span style={{ fontSize: '12px', color: '#627c6b', fontWeight: '600' }}>एकूण जारी बिले (Total Bills)</span>
          <strong style={{ display: 'block', fontSize: '26px', color: '#176b3a', marginTop: '4px' }}>
            {bills.length}
          </strong>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bill-history-search">
        <input
          type="text"
          placeholder="🔍 १० अंकी मोबाईल नंबर, ग्राहकाचे नाव किंवा बिल क्र. ने शोधा..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1.5px solid #cad8ce',
            fontSize: '14px',
            background: '#ffffff'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              padding: '0 16px',
              borderRadius: '12px',
              border: '1px solid #cad8ce',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Bills Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5b6f60' }}>
          ⏳ डेटाबेस तपासत आहे...
        </div>
      ) : filteredBills.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px dashed #cad8ce',
          borderRadius: '20px',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '42px', marginBottom: '10px' }}>🧾</div>
          <h3 style={{ margin: '0 0 8px', color: '#176b3a' }}>कोणतेही बिल आढळले नाही</h3>
          <p style={{ color: '#66736b', margin: '0 0 20px', fontSize: '14px' }}>
            {searchQuery ? 'दिलेल्या शोधानुसार बिल सापडले नाही.' : 'अजून एकही डिजिटल बिल तयार केलेले नाही.'}
          </p>
          <Link to="/admin/billing" className="primary-btn">
            पहिले डिजिटल बिल तयार करा
          </Link>
        </div>
      ) : (
        <>
          <div className="table-scroll-hint">
            👉 डावीकडे सरकवून सर्व माहिती (तारीख, ग्राहक, रक्कम, बिल) पहा
          </div>
          <div className="bill-table-wrapper">
            <table className="bill-table">
            <thead>
              <tr>
                <th>डिजिटल बिल आयडी (Unique ID)</th>
                <th>तारीख</th>
                <th>ग्राहकाचे नाव</th>
                <th>मोबाईल नंबर</th>
                <th style={{ textAlign: 'right' }}>एकूण रक्कम (₹)</th>
                <th style={{ textAlign: 'center' }}>कृती (Action)</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill, index) => (
                <tr key={bill.billNo || index}>
                  <td>
                    <strong style={{ color: '#176b3a', fontSize: '12.5px' }}>{bill.billNo}</strong>
                    {bill.updatedAt && (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '600' }}>
                          ● संपादित
                        </span>
                        {bill.editHistory && bill.editHistory.length > 0 && (
                          <span style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            fontSize: '9.5px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: '700'
                          }}>
                            📜 {bill.editHistory.length} बदल
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '13px' }}>{bill.billDate}</td>
                  <td style={{ fontWeight: '600' }}>{bill.customerName}</td>
                  <td>
                    <span style={{
                      background: '#f2f7f3',
                      color: '#1a482b',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '13px'
                    }}>
                      {bill.customerMobile}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#176b3a' }}>
                    ₹ {Number(bill.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenBill(bill)}
                      style={{
                        background: '#176b3a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(23, 107, 58, 0.2)'
                      }}
                    >
                      👁️ बिल उघडा
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}

      {/* Offscreen Printable Container for Active Bill */}
      {activeBill && (
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
          <InvoiceTemplate ref={historyInvoiceRef} bill={activeBill} />
        </div>
      )}

      {/* ========================================================
          FULL BILL VIEWER & RED UPDATE MODAL
         ======================================================== */}
      {modalOpen && activeBill && (
        <div className="invoice-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className={`invoice-modal-container ${isEditMode ? 'edit-mode-card' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: isEditMode ? '960px' : '880px' }}
          >
            {/* Top Modal Header */}
            <div
              className="invoice-modal-header"
              style={{
                background: isEditMode ? '#fef2f2' : '#f6faf6',
                borderBottom: isEditMode ? '2px solid #fecdd3' : '1px solid #dce8de'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ color: isEditMode ? '#dc2626' : '#176b3a', margin: 0, fontSize: '18px' }}>
                  {isEditMode ? '⚠️ बिल संपादन मोड (Edit Bill)' : `📄 बिल: ${activeBill.billNo}`}
                </h3>
                {activeBill.updatedAt && !isEditMode && (
                  <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                    संपादित बिल
                  </span>
                )}
              </div>

              {/* Header Right Actions: Prominent Edit Button at Top */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {!isEditMode ? (
                  <>
                    <button
                      type="button"
                      className="btn-edit-trigger"
                      onClick={handleStartEditing}
                    >
                      ✏️ हे बिल संपादित करा (Edit Bill)
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewActivityLog(!viewActivityLog)}
                      style={{
                        background: viewActivityLog ? '#f3e8ff' : '#f9fafb',
                        color: viewActivityLog ? '#6b21a8' : '#374151',
                        border: '1.5px solid',
                        borderColor: viewActivityLog ? '#c084fc' : '#d1d5db',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {viewActivityLog
                        ? '👁️ बिल पावती पहा'
                        : `📜 बदल इतिहास (${activeBill.editHistory?.length || 0})`}
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => window.print()}
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                    >
                      🖨️ प्रिंट
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => triggerPdfDownload(activeBill)}
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                    >
                      📥 PDF
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-cancel-edit"
                    onClick={() => setIsEditMode(false)}
                    style={{ padding: '8px 14px', fontSize: '13px' }}
                  >
                    ✕ संपादन रद्द करा
                  </button>
                )}

                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '22px',
                    cursor: 'pointer',
                    color: isEditMode ? '#991b1b' : '#556b5a',
                    marginLeft: '8px'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Success Toast inside modal */}
            {updateSuccess && !isEditMode && (
              <div style={{
                background: '#eaf6ee',
                color: '#135c2d',
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: '700',
                borderBottom: '1px solid #b6e2c2',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ✅ बिल यशस्वीरीत्या अपडेट करण्यात आले आहे!
              </div>
            )}

            {/* Modal Body */}
            <div className="invoice-modal-body" style={{ background: isEditMode ? '#fffdfd' : '#ecefe8', padding: '20px 24px' }}>
              {!isEditMode ? (
                viewActivityLog ? (
                  /* ================= Activity History View ================= */
                  <div style={{
                    width: '100%',
                    maxWidth: '820px',
                    margin: '0 auto',
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #dfe7e1',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1.5px solid #e5e7eb',
                      paddingBottom: '16px',
                      marginBottom: '20px',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px', color: '#1f2937', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          📜 बिलाचा संपादन इतिहास (Bill Edit History & Activity Log)
                        </h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                          🔒 ही नोंद फक्त ॲडमिनसाठी आहे (बिलाच्या छापील पावतीवर किंवा PDF वर हे येणार नाही).
                        </p>
                      </div>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setViewActivityLog(false)}
                        style={{ padding: '7px 14px', fontSize: '12.5px' }}
                      >
                        ⬅️ मूळ पावती पहा
                      </button>
                    </div>

                    {(!activeBill.editHistory || activeBill.editHistory.length === 0) ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '50px 20px',
                        background: '#f9fafb',
                        borderRadius: '14px',
                        border: '1px dashed #d1d5db'
                      }}>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🌱</div>
                        <h4 style={{ margin: '0 0 6px', color: '#374151', fontSize: '16px' }}>
                          हे मूळ बिल आहे (No Edits Recorded)
                        </h4>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                          तयार केल्यापासून या बिलामध्ये कोणताही बदल केलेला नाही.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {activeBill.editHistory.map((entry, idx) => (
                          <div
                            key={entry.id || idx}
                            style={{
                              border: '1.5px solid #e2e8f0',
                              borderRadius: '14px',
                              overflow: 'hidden',
                              background: '#ffffff',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                            }}
                          >
                            <div style={{
                              background: '#f8fafc',
                              padding: '10px 16px',
                              borderBottom: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '12.5px'
                            }}>
                              <div>
                                <span style={{ color: '#64748b' }}>तारीख व वेळ: </span>
                                <strong style={{ color: '#0f172a' }}>
                                  {entry.formattedDateTime || entry.timestamp}
                                </strong>
                              </div>
                              <span style={{
                                background: '#fee2e2',
                                color: '#991b1b',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '11px'
                              }}>
                                {entry.changes?.length || 0} बदल नोंदवले गेले
                              </span>
                            </div>

                            <div style={{ overflowX: 'auto', padding: '14px 16px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                  <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: '25%' }}>बदललेली माहिती (Field)</th>
                                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: '37%' }}>पूर्वीचे मूल्य (Previous Value)</th>
                                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: '38%' }}>नवीन मूल्य (Current Value)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entry.changes?.map((ch, chIdx) => (
                                    <tr key={chIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '10px', fontWeight: '600', color: '#1e293b' }}>
                                        {ch.label}
                                      </td>
                                      <td style={{ padding: '10px', color: '#dc2626', textDecoration: 'line-through', background: '#fff8f8' }}>
                                        {ch.previousValue}
                                      </td>
                                      <td style={{ padding: '10px', color: '#16a34a', fontWeight: '700', background: '#f0fdf4' }}>
                                        {ch.currentValue}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ================= Normal Clean View Mode ================= */
                  <div style={{ transform: 'scale(0.88)', transformOrigin: 'top center' }}>
                    <InvoiceTemplate bill={activeBill} />
                  </div>
                )
              ) : (
                /* ================= RED EDIT / UPDATE MODE ================= */
                <div style={{ width: '100%' }}>
                  {/* Red Notice Banner */}
                  <div className="edit-mode-banner">
                    <span style={{ fontSize: '24px' }}>⚠️</span>
                    <div>
                      <strong>लक्ष द्या (Bill Update Mode):</strong> तुम्ही जुन्या बिलामध्ये बदल करत आहात. नवीन बिल तयार होणार नाही, तर याच बिलाचा डेटाबेस रेकॉर्ड अद्यतनित (Update) केला जाईल.
                    </div>
                  </div>

                  {/* Customer Info Card in Red */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 16px', color: '#b91c1c', fontSize: '15px' }}>
                      👤 ग्राहकाची माहिती संपादन
                    </h4>

                    <div className="billing-grid-3">
                      {/* Read-Only Bill ID */}
                      <div className="form-group">
                        <label>डिजिटल बिल क्रमांक (Locked):</label>
                        <input
                          type="text"
                          value={activeBill.billNo}
                          readOnly
                          style={{
                            background: '#fef2f2',
                            color: '#991b1b',
                            fontWeight: '700',
                            border: '1.5px solid #fecdd3',
                            cursor: 'not-allowed'
                          }}
                        />
                        <small style={{ color: '#b91c1c', fontSize: '10.5px' }}>
                          🔒 मूळ डिजिटल बिल आयडी बदलता येत नाही.
                        </small>
                      </div>

                      {/* Mobile (Read-Only Primary Key) */}
                      <div className="form-group">
                        <label>मोबाईल क्रमांक (Primary Key):</label>
                        <input
                          type="text"
                          value={activeBill.customerMobile}
                          readOnly
                          style={{
                            background: '#fef2f2',
                            color: '#991b1b',
                            fontWeight: '700',
                            border: '1.5px solid #fecdd3',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>

                      {/* Bill Date */}
                      <div className="form-group">
                        <label>तारीख (Date):</label>
                        <input
                          type="date"
                          value={editBillDate}
                          onChange={(e) => setEditBillDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="billing-grid-2">
                      <div className="form-group">
                        <label>ग्राहकाचे नाव <span style={{ color: '#dc2626' }}>*</span>:</label>
                        <input
                          type="text"
                          value={editCustomerName}
                          onChange={(e) => setEditCustomerName(e.target.value)}
                          required
                        />
                        {editErrors.customerName && (
                          <span style={{ color: '#dc2626', fontSize: '12px' }}>{editErrors.customerName}</span>
                        )}
                      </div>

                      <div className="form-group">
                        <label>पेमेंट प्रकार:</label>
                        <select
                          value={editPaymentMode}
                          onChange={(e) => setEditPaymentMode(e.target.value)}
                        >
                          <option value="Cash">Cash (रोख)</option>
                          <option value="UPI / Online">PhonePe / Google Pay / UPI</option>
                          <option value="Pending">बाकी (Pending / Credit)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '14px' }}>
                      <label>पत्ता / गाव:</label>
                      <input
                        type="text"
                        value={editCustomerAddress}
                        onChange={(e) => setEditCustomerAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Items Card in Red */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '16px',
                    padding: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 16px', color: '#b91c1c', fontSize: '15px' }}>
                      🌾 उत्पादने व दर संपादन (Edit Items)
                    </h4>

                    {editErrors.items && (
                      <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '13px' }}>
                        ⚠️ {editErrors.items}
                      </div>
                    )}

                    <div className="table-scroll-hint">
                      👉 डावीकडे सरकवून सर्व रकाने (प्रमाण, एकक, दर, रक्कम) संपादित करा
                    </div>

                    <div className="items-table-wrapper" style={{ border: '1px solid #fecdd3' }}>
                      <table className="items-input-table">
                        <thead>
                          <tr style={{ background: '#fef2f2', color: '#991b1b' }}>
                            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                            <th>उत्पादनाचे नाव *</th>
                            <th style={{ width: '110px' }}>प्रमाण *</th>
                            <th style={{ width: '130px' }}>एकक</th>
                            <th style={{ width: '140px' }}>दर प्रति नग ₹ *</th>
                            <th style={{ width: '140px', textAlign: 'right' }}>रक्कम ₹</th>
                            <th style={{ width: '50px', textAlign: 'center' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editItems.map((item, index) => (
                            <tr key={item.id || index}>
                              <td style={{ textAlign: 'center', color: '#991b1b', fontWeight: '600' }}>
                                {index + 1}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleEditItemChange(index, 'name', e.target.value)}
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  step="any"
                                  value={item.qty}
                                  onChange={(e) => handleEditItemChange(index, 'qty', e.target.value)}
                                  required
                                />
                              </td>
                              <td>
                                <select
                                  value={item.unit}
                                  onChange={(e) => handleEditItemChange(index, 'unit', e.target.value)}
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
                                  value={item.price}
                                  onChange={(e) => handleEditItemChange(index, 'price', e.target.value)}
                                  required
                                />
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                                ₹ {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-remove-row"
                                  onClick={() => removeEditItemRow(index)}
                                  title="काढा"
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
                      onClick={addEditItemRow}
                      style={{ color: '#b91c1c', borderColor: '#f87171', background: '#fef2f2' }}
                    >
                      ➕ आणखी उत्पादन जोडा
                    </button>

                    {/* Notes */}
                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label>नोंद / शेरा:</label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                    </div>

                    {/* Red Summary Total Bar */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#fff5f5',
                      border: '1.5px solid #fca5a5',
                      padding: '16px 20px',
                      borderRadius: '14px',
                      marginTop: '20px'
                    }}>
                      <div>
                        <span style={{ fontSize: '12px', color: '#7f1d1d' }}>अक्षरी एकूण रक्कम:</span>
                        <div style={{ fontWeight: '700', color: '#991b1b', fontSize: '13px' }}>
                          {numberToMarathiWords(editTotalAmount)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', color: '#7f1d1d' }}>अद्यतनित एकूण रक्कम (Grand Total):</span>
                        <strong style={{ display: 'block', fontSize: '26px', color: '#b91c1c' }}>
                          ₹ {Number(editTotalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ================= Modal Footer ================= */}
            <div
              className="invoice-modal-footer"
              style={{
                background: isEditMode ? '#fff8f8' : '#ffffff',
                borderTop: isEditMode ? '1.5px solid #fecdd3' : '1px solid #e1ebe2'
              }}
            >
              {!isEditMode ? (
                /* Normal Mode Footer */
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-edit-trigger"
                    onClick={handleStartEditing}
                  >
                    ✏️ हे बिल संपादित करा (Edit Bill)
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => window.print()}
                      style={{ padding: '10px 18px', fontSize: '13px' }}
                    >
                      🖨️ थेट प्रिंट करा
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => triggerPdfDownload(activeBill)}
                      style={{ padding: '10px 18px', fontSize: '13px' }}
                    >
                      📥 PDF डाऊनलोड करा
                    </button>
                  </div>
                </div>
              ) : (
                /* RED UPDATE MODE: 3 Action Buttons */
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-cancel-edit"
                    onClick={() => setIsEditMode(false)}
                    disabled={isProcessing}
                  >
                    ✕ संपादन रद्द करा (Cancel)
                  </button>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Red Button 3: Update Data Only */}
                    <button
                      type="button"
                      className="btn-red-save"
                      onClick={() => handleExecuteUpdate('update_save_only')}
                      disabled={isProcessing}
                    >
                      {isProcessing && actionType === 'update_save_only' ? '⏳ साठवत आहे...' : '💾 फक्त बदल सेव्ह करा'}
                    </button>

                    {/* Red Button 2: Update & Print */}
                    <button
                      type="button"
                      className="btn-red-print"
                      onClick={() => handleExecuteUpdate('update_print')}
                      disabled={isProcessing}
                    >
                      {isProcessing && actionType === 'update_print' ? '⏳ प्रिंट तयार होत आहे...' : '🖨️ अपडेट व प्रिंट करा'}
                    </button>

                    {/* Red Button 1: Update & Download PDF */}
                    <button
                      type="button"
                      className="btn-red-pdf"
                      onClick={() => handleExecuteUpdate('update_pdf')}
                      disabled={isProcessing}
                    >
                      {isProcessing && actionType === 'update_pdf' ? '⏳ अपडेट होत आहे...' : '📥 अपडेट व PDF डाऊनलोड'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
