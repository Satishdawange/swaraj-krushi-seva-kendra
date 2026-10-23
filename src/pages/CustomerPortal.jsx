import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchRecentRecords } from '../service/googleSheetsService';
import InvoiceTemplate from '../components/InvoiceTemplate';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import LogoImg from '../images/sksklogo.png';
import ShopProp from '../config/shopProps';

export default function CustomerPortal() {
  const { user, signOut } = useAuth();
  const [customerBills, setCustomerBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBill, setActiveBill] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const invoicePrintRef = useRef(null);

  const userMobile = user?.mobile || (user?.username && /^\d{10}$/.test(user.username) ? user.username : '');

  useEffect(() => {
    async function loadCustomerBills() {
      setLoading(true);
      try {
        const { items } = await fetchRecentRecords('Bills', { limit: 100 });
        const userClean = (userMobile || '').replace(/\D/g, '').slice(-10);

        const matched = items.filter(b => {
          const bMobile = String(b.customerMobile || b.Mobile || '').replace(/\D/g, '').slice(-10);
          return bMobile === userClean;
        });

        setCustomerBills(matched);
      } catch (err) {
        console.warn('Error loading customer bills:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCustomerBills();
  }, [userMobile]);

  // Aggregate stats
  const totalPurchased = customerBills.reduce((acc, b) => acc + Number(b.totalAmount || b.Total_Amount || 0), 0);
  const totalPaid = customerBills.reduce((acc, b) => acc + Number(b.paidAmount || b.Paid_Amount || 0), 0);
  const totalBalance = customerBills.reduce((acc, b) => acc + Number(b.balanceAmount || b.Balance_Amount || 0), 0);

  // Download PDF
  const handleDownloadPDF = async (bill) => {
    setActiveBill(bill);
    setIsDownloading(true);

    setTimeout(async () => {
      try {
        const element = invoicePrintRef.current;
        if (!element) return;

        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Bill_${bill.billNo || bill.Bill_No || 'Swaraj_KSK'}.pdf`);
      } catch (e) {
        console.error('PDF error:', e);
        alert('पीडीएफ डाउनलोड करताना त्रुटी आली.');
      } finally {
        setIsDownloading(false);
      }
    }, 400);
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Customer Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #176b3a 0%, #0d4624 100%)',
        borderRadius: '16px',
        padding: '24px',
        color: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px',
        boxShadow: '0 8px 24px rgba(23, 107, 58, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px'
          }}>
            🌾
          </div>
          <div>
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              शेतकरी ग्राहक पोर्टल (Farmer Portal)
            </span>
            <h1 style={{ margin: '4px 0 2px', fontSize: '22px', fontWeight: '800' }}>
              {user?.fullName || 'शेतकरी बांधव'}
            </h1>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
              मोबाईल: {userMobile || 'उपलब्ध नाही'} • स्वराज कृषी सेवा केंद्र
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={`https://wa.me/${ShopProp.whatsapp || '918459568940'}?text=${encodeURIComponent(
              `नमस्कार निलेश दादा, मी स्वराज कृषी सेवा केंद्र ग्राहक पोर्टलवरून बोलत आहे (${user?.fullName || userMobile}). मला औषधांची चौकशी करायची आहे.`
            )}`}
            target="_blank"
            rel="noreferrer"
            style={{
              background: '#25D366',
              color: '#ffffff',
              padding: '9px 16px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            💬 निलेश दवंगे (WhatsApp)
          </a>
          <button
            onClick={signOut}
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '10px',
              padding: '9px 14px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            लॉगआउट
          </button>
        </div>
      </div>

      {/* Account KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '18px',
          border: '1px solid #e1e8e3',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '12px', color: '#65776d', fontWeight: '600' }}>एकूण खरेदी रक्कम</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#176b3a', marginTop: '6px' }}>
            ₹ {totalPurchased.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#88988e', marginTop: '4px' }}>
            {customerBills.length} बिले जारी
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '18px',
          border: '1px solid #e1e8e3',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '12px', color: '#65776d', fontWeight: '600' }}>एकूण जमा (भरलेली) रक्कम</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#137333', marginTop: '6px' }}>
            ₹ {totalPaid.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#137333', marginTop: '4px' }}>
            ✓ पूर्ण भरणा
          </div>
        </div>

        <div style={{
          background: totalBalance > 0 ? '#fff8f6' : '#ffffff',
          borderRadius: '14px',
          padding: '18px',
          border: totalBalance > 0 ? '1px solid #fecdca' : '1px solid #e1e8e3',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '12px', color: totalBalance > 0 ? '#b42318' : '#65776d', fontWeight: '600' }}>
            शिल्लक येणे बाकी (उधारी)
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: totalBalance > 0 ? '#b42318' : '#176b3a', marginTop: '6px' }}>
            ₹ {totalBalance.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: totalBalance > 0 ? '#b42318' : '#65776d', marginTop: '4px' }}>
            {totalBalance > 0 ? '⚠️ बाकी रक्कम कृपया जमा करावी' : '✓ कोणतीही उधारी शिल्लक नाही'}
          </div>
        </div>
      </div>

      {/* Bills History Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e1e8e3',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: '#176b3a', margin: '0 0 4px', fontWeight: '700' }}>
              माझी खरेदी व बिले (My Invoices)
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#65776d' }}>
              स्वराज कृषी सेवा केंद्रामधून घेतलेली सर्व बिले येथे पहा व डाऊनलोड करा
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#65776d' }}>
            ⏳ बिले लोड होत आहेत...
          </div>
        ) : customerBills.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: '#f9fbf9',
            borderRadius: '12px',
            border: '1px dashed #c9d8ce'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
            <h4 style={{ margin: '0 0 4px', color: '#334e3b' }}>सध्या कोणतेही बिल सापडले नाही</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#65776d' }}>
              जेव्हा आपण दुकानातून खरेदी कराल, तेव्हा आपल्या मोबाईल नंबरवर जारी केलेले बिल येथे दिसेल.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f4f8f5', borderBottom: '2px solid #dbe6de', textAlign: 'left' }}>
                  <th style={{ padding: '12px 10px', color: '#27382d' }}>बिल नं.</th>
                  <th style={{ padding: '12px 10px', color: '#27382d' }}>तारीख</th>
                  <th style={{ padding: '12px 10px', color: '#27382d' }}>एकूण रक्कम</th>
                  <th style={{ padding: '12px 10px', color: '#27382d' }}>जमा रक्कम</th>
                  <th style={{ padding: '12px 10px', color: '#27382d' }}>बाकी उधारी</th>
                  <th style={{ padding: '12px 10px', color: '#27382d' }}>पेमेंट स्थिती</th>
                  <th style={{ padding: '12px 10px', color: '#27382d', textAlign: 'center' }}>कृती (Action)</th>
                </tr>
              </thead>
              <tbody>
                {customerBills.map((b, idx) => {
                  const billNo = b.billNo || b.Bill_No || `BILL-${idx + 1}`;
                  const billDate = b.billDate || b.Date || '—';
                  const total = Number(b.totalAmount || b.Total_Amount || 0);
                  const paid = Number(b.paidAmount || b.Paid_Amount || 0);
                  const bal = Number(b.balanceAmount || b.Balance_Amount || 0);
                  const status = b.paymentStatus || b.Payment_Status || (bal === 0 ? 'Fully Paid' : 'Half Paid');

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #edf2ee' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '700', color: '#176b3a' }}>{billNo}</td>
                      <td style={{ padding: '12px 10px', color: '#555' }}>{billDate}</td>
                      <td style={{ padding: '12px 10px', fontWeight: '700' }}>₹ {total.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 10px', color: '#137333', fontWeight: '600' }}>₹ {paid.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 10px', color: bal > 0 ? '#b42318' : '#65776d', fontWeight: '700' }}>
                        {bal > 0 ? `₹ ${bal.toLocaleString('en-IN')}` : '₹ ० (शिल्लक नाही)'}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: status === 'Fully Paid' ? '#e6f4ea' : (status === 'Half Paid' ? '#fef7e0' : '#fce8e6'),
                          color: status === 'Fully Paid' ? '#137333' : (status === 'Half Paid' ? '#b06000' : '#c5221f')
                        }}>
                          {status === 'Fully Paid' ? 'पूर्ण भरणा' : (status === 'Half Paid' ? 'अंशतः भरणा' : 'उधारी')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(b)}
                          style={{
                            background: '#176b3a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          📥 PDF बिल
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hidden Invoice print renderer */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        {activeBill && (
          <InvoiceTemplate
            ref={invoicePrintRef}
            bill={{
              ...activeBill,
              billNo: activeBill.billNo || activeBill.Bill_No,
              customerName: activeBill.customerName || activeBill.Customer_Name,
              customerMobile: activeBill.customerMobile || activeBill.Mobile,
              customerAddress: activeBill.customerAddress || activeBill.Address,
              billDate: activeBill.billDate || activeBill.Date,
              items: Array.isArray(activeBill.items) ? activeBill.items : (typeof activeBill.Items_JSON === 'string' ? JSON.parse(activeBill.Items_JSON || '[]') : []),
              totalAmount: Number(activeBill.totalAmount || activeBill.Total_Amount || 0),
              paidAmount: Number(activeBill.paidAmount || activeBill.Paid_Amount || 0),
              balanceAmount: Number(activeBill.balanceAmount || activeBill.Balance_Amount || 0),
              paymentMode: activeBill.paymentMode || activeBill.Payment_Mode || 'Cash',
              paymentStatus: activeBill.paymentStatus || activeBill.Payment_Status || 'Fully Paid',
              notes: activeBill.notes || activeBill.Notes || ''
            }}
          />
        )}
      </div>
    </div>
  );
}

