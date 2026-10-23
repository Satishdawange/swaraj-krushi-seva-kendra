import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ChallanTemplate from '../components/ChallanTemplate';
import { fetchRecentRecords } from '../service/googleSheetsService';
import '../CSS/billing.css';

export default function ChallanHistory() {
  const navigate = useNavigate();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Challan View Modal
  const [activeChallan, setActiveChallan] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const printChallanRef = useRef(null);

  const loadChallans = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetchRecentRecords('Challans', {
        page: pageNum,
        limit: 10,
        search: searchTerm
      });
      setChallans(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
      setPage(res.page || 1);
    } catch (err) {
      console.warn('Error loading challans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallans(page);
  }, [page, searchTerm]);

  // Handle PDF Download
  const handleDownloadPDF = async (challan) => {
    setActiveChallan(challan);
    setIsProcessingPdf(true);

    setTimeout(async () => {
      try {
        const el = printChallanRef.current;
        if (!el) return;

        const canvas = await html2canvas(el, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Challan_${challan.challanNo || challan.Challan_No}.pdf`);
      } catch (e) {
        console.error('PDF error:', e);
        alert('पीडीएफ डाउनलोड करताना त्रुटी आली.');
      } finally {
        setIsProcessingPdf(false);
      }
    }, 300);
  };

  // Convert to Bill
  const handleConvertToBill = (challan) => {
    const rawItems = Array.isArray(challan.items)
      ? challan.items
      : (typeof challan.Items_JSON === 'string' ? JSON.parse(challan.Items_JSON || '[]') : []);

    navigate('/admin/billing', {
      state: {
        convertedFromChallan: true,
        customerName: challan.customerName || challan.Customer_Name,
        customerMobile: challan.customerMobile || challan.Mobile,
        customerAddress: challan.customerAddress || challan.Address,
        items: rawItems.map(i => ({
          id: Date.now() + Math.random(),
          name: i.name || '',
          qty: Number(i.qty || 1),
          unit: i.unit || 'नग',
          price: 0,
          total: 0
        })),
        notes: `चालन क्र. ${challan.challanNo || challan.Challan_No} वरून तयार केलेले बिल.`
      }
    });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
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
            📜 डिलिव्हरी चालन इतिहास (Challan History)
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#65776d' }}>
            जारी केलेली सर्व चालने, पोच पावत्या व स्थिती तपासा
          </p>
        </div>

        <Link
          to="/admin/challan/create"
          style={{
            background: '#176b3a',
            color: '#ffffff',
            padding: '9px 18px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(23, 107, 58, 0.2)'
          }}
        >
          ➕ नवीन चालन बनवा
        </Link>
      </div>

      {/* Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #e1e8e3',
        marginBottom: '16px'
      }}>
        <input
          type="text"
          placeholder="🔍 चालन क्र., ग्राहकाचे नाव, मोबाईल नंबर किंवा वाहन क्र. शोधा..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #c2d6c7',
            fontSize: '13px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e1e8e3',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f4f8f5', borderBottom: '2px solid #dbe6de', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', color: '#27382d' }}>चालन क्र.</th>
                <th style={{ padding: '12px 14px', color: '#27382d' }}>तारीख</th>
                <th style={{ padding: '12px 14px', color: '#27382d' }}>ग्राहक नाव</th>
                <th style={{ padding: '12px 14px', color: '#27382d' }}>मोबाईल</th>
                <th style={{ padding: '12px 14px', color: '#27382d' }}>वाहन क्र.</th>
                <th style={{ padding: '12px 14px', color: '#27382d' }}>स्थिती</th>
                <th style={{ padding: '12px 14px', color: '#27382d', textAlign: 'center' }}>कृती (Actions)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#65776d' }}>
                    ⏳ चालने लोड होत आहेत...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#65776d' }}>
                    कोणतेही चालन सापडले नाही.
                  </td>
                </tr>
              ) : (
                challans.map((ch, idx) => {
                  const chNo = ch.challanNo || ch.Challan_No || `CH-${idx + 1}`;
                  const cName = ch.customerName || ch.Customer_Name || '—';
                  const cMob = ch.customerMobile || ch.Mobile || '—';
                  const cDate = ch.date || ch.Date || '—';
                  const vNo = ch.vehicleNo || ch.Vehicle_No || 'दुकानातून थेट';
                  const status = ch.status || ch.Status || 'Dispatched';

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #edf2ee' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#176b3a' }}>{chNo}</td>
                      <td style={{ padding: '12px 14px', color: '#555' }}>{cDate}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '600' }}>{cName}</td>
                      <td style={{ padding: '12px 14px', color: '#555' }}>{cMob}</td>
                      <td style={{ padding: '12px 14px', color: '#555' }}>{vNo}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: '#e6f4ea',
                          color: '#137333'
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveChallan(ch);
                              setModalOpen(true);
                            }}
                            style={{
                              background: '#f0f5f1',
                              border: '1px solid #c2d6c7',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              color: '#176b3a'
                            }}
                          >
                            👁️ पहा
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(ch)}
                            style={{
                              background: '#176b3a',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            📥 PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConvertToBill(ch)}
                            style={{
                              background: '#e8f5e9',
                              color: '#176b3a',
                              border: '1px solid #176b3a',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="या चालनाचे बिलात रूपांतर करा"
                          >
                            🧾 बिल करा
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination 10 per page */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: '#fafbfa',
          borderTop: '1px solid #edf2ee',
          fontSize: '12.5px',
          color: '#556b5c'
        }}>
          <div>
            एकूण नोंदणीकृत चालने: <strong>{totalCount}</strong> (पान <strong>{page}</strong> / {totalPages})
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{
                background: page <= 1 ? '#eee' : '#176b3a',
                color: page <= 1 ? '#999' : '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '12px'
              }}
            >
              ◀ मागील १०
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{
                background: page >= totalPages ? '#eee' : '#176b3a',
                color: page >= totalPages ? '#999' : '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '12px'
              }}
            >
              पुढील १० ▶
            </button>
          </div>
        </div>
      </div>

      {/* Modal View */}
      {modalOpen && activeChallan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '840px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#176b3a' }}>
                डिलिव्हरी चालन: {activeChallan.challanNo || activeChallan.Challan_No}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleDownloadPDF(activeChallan)}
                  style={{
                    background: '#176b3a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  📥 PDF डाउनलोड
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <ChallanTemplate
              challan={{
                challanNo: activeChallan.challanNo || activeChallan.Challan_No,
                date: activeChallan.date || activeChallan.Date,
                customerName: activeChallan.customerName || activeChallan.Customer_Name,
                customerMobile: activeChallan.customerMobile || activeChallan.Mobile,
                customerAddress: activeChallan.customerAddress || activeChallan.Address,
                vehicleNo: activeChallan.vehicleNo || activeChallan.Vehicle_No,
                driverName: activeChallan.driverName || activeChallan.Driver_Name,
                remarks: activeChallan.remarks || activeChallan.Remarks,
                items: Array.isArray(activeChallan.items)
                  ? activeChallan.items
                  : (typeof activeChallan.Items_JSON === 'string' ? JSON.parse(activeChallan.Items_JSON || '[]') : [])
              }}
            />
          </div>
        </div>
      )}

      {/* Hidden PDF Canvas element */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        {activeChallan && (
          <ChallanTemplate
            ref={printChallanRef}
            challan={{
              challanNo: activeChallan.challanNo || activeChallan.Challan_No,
              date: activeChallan.date || activeChallan.Date,
              customerName: activeChallan.customerName || activeChallan.Customer_Name,
              customerMobile: activeChallan.customerMobile || activeChallan.Mobile,
              customerAddress: activeChallan.customerAddress || activeChallan.Address,
              vehicleNo: activeChallan.vehicleNo || activeChallan.Vehicle_No,
              driverName: activeChallan.driverName || activeChallan.Driver_Name,
              remarks: activeChallan.remarks || activeChallan.Remarks,
              items: Array.isArray(activeChallan.items)
                ? activeChallan.items
                : (typeof activeChallan.Items_JSON === 'string' ? JSON.parse(activeChallan.Items_JSON || '[]') : [])
            }}
          />
        )}
      </div>
    </div>
  );
}

