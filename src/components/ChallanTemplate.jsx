import React, { forwardRef } from 'react';
import LogoImg from '../images/sksklogo.png';
import ShopProp from '../config/shopProps';

const ChallanTemplate = forwardRef(({ challan }, ref) => {
  if (!challan) return null;

  const {
    challanNo = 'CH-DRAFT',
    date = new Date().toISOString().split('T')[0],
    customerName = '',
    customerMobile = '',
    customerAddress = '',
    vehicleNo = '',
    driverName = '',
    items = [],
    remarks = '',
    status = 'Dispatched'
  } = challan;

  // Format date DD/MM/YYYY
  const formattedDate = (() => {
    try {
      const [y, m, d] = date.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return date;
    } catch (e) {
      return date;
    }
  })();

  return (
    <div
      ref={ref}
      style={{
        width: '794px', // A4 96 DPI
        minHeight: '1123px',
        background: '#ffffff',
        color: '#1a201c',
        fontFamily: "'Noto Sans Devanagari', 'Segoe UI', Arial, sans-serif",
        padding: '36px 42px',
        boxSizing: 'border-box',
        position: 'relative',
        margin: '0 auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}
    >
      {/* HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '3px double #176b3a',
        paddingBottom: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={LogoImg}
            alt="स्वराज कृषी सेवा केंद्र"
            style={{ width: '80px', height: '65px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#176b3a', letterSpacing: '1px' }}>
              ।। श्री गणेशाय नमः ।।
            </div>
            <h1 style={{ margin: '2px 0 0', fontSize: '26px', fontWeight: '800', color: '#176b3a', lineHeight: '1.1' }}>
              स्वराज कृषी सेवा केंद्र
            </h1>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#2d4b35', letterSpacing: '0.4px' }}>
              SWARAJ KRUSHI SEVA KENDRA
            </div>
            <div style={{ fontSize: '11px', color: '#4a5d50', marginTop: '2px' }}>
              खते, बी-बियाणे, कीटकनाशके व आधुनिक कृषी सल्ला केंद्र
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#334438', lineHeight: '1.45' }}>
          <div style={{ fontWeight: '700', color: '#176b3a', fontSize: '12.5px' }}>
            प्रोप्रायटर: {ShopProp.ownerName || 'निलेश त्र्यंबक दवंगे'}
          </div>
          <div>मोबाईल: {ShopProp.phone || '+91 8459568940'}</div>
          <div>{ShopProp.address || 'मु. पो. कानमंडाळे, ता. चांदवड, जि. नाशिक'}</div>
          <div>पिन कोड: {ShopProp.pincode || '४२३१०१'}</div>
        </div>
      </div>

      {/* CHALLAN TITLE BADGE */}
      <div style={{
        textAlign: 'center',
        background: '#e8f5e9',
        border: '1.5px solid #176b3a',
        borderRadius: '6px',
        padding: '6px 12px',
        marginBottom: '16px'
      }}>
        <span style={{ fontSize: '15px', fontWeight: '800', color: '#176b3a', letterSpacing: '1px' }}>
          डिलिव्हरी चालन / पोच पावती (DELIVERY CHALLAN)
        </span>
      </div>

      {/* DETAILS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '16px',
        border: '1px solid #d0dcd4',
        borderRadius: '8px',
        padding: '14px',
        marginBottom: '18px',
        fontSize: '12.5px',
        background: '#fafcfa'
      }}>
        <div>
          <div style={{ fontWeight: '700', color: '#176b3a', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px' }}>
            मालाची डिलिव्हरी घेणारा (Consignee / Customer):
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>
            {customerName || '—'}
          </div>
          <div style={{ marginTop: '3px' }}>
            मोबाईल: <strong>{customerMobile || '—'}</strong>
          </div>
          <div style={{ marginTop: '2px', color: '#444' }}>
            पत्ता/गाव: {customerAddress || '—'}
          </div>
        </div>

        <div style={{ borderLeft: '1px dashed #c0d4c6', paddingLeft: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#555' }}>चालन क्रमांक:</span>
            <strong style={{ color: '#176b3a', fontSize: '13px' }}>{challanNo}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#555' }}>चालन तारीख:</span>
            <strong>{formattedDate}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#555' }}>वाहन क्रमांक:</span>
            <strong>{vehicleNo || 'दुकानातून थेट / स्वतः'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#555' }}>चालक/वाहक:</span>
            <strong>{driverName || '—'}</strong>
          </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '12.5px',
        marginBottom: '20px'
      }}>
        <thead>
          <tr style={{ background: '#176b3a', color: '#ffffff', textAlign: 'left' }}>
            <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>अ.क्र.</th>
            <th style={{ padding: '8px 10px' }}>मालाचा तपशील / उत्पादनाचे नाव</th>
            <th style={{ padding: '8px 10px', width: '90px', textAlign: 'center' }}>नग / प्रमाण</th>
            <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center' }}>युनिट</th>
            <th style={{ padding: '8px 10px', width: '180px' }}>शेरा / वापर</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #d0dcd4', background: idx % 2 === 0 ? '#fff' : '#f9fcf9' }}>
              <td style={{ padding: '10px 8px', textAlign: 'center', color: '#555' }}>{idx + 1}</td>
              <td style={{ padding: '10px 8px', fontWeight: '700', color: '#1f2e23' }}>
                {item.name}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '800', fontSize: '13px' }}>
                {item.qty}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'center', color: '#555' }}>
                {item.unit || 'नग'}
              </td>
              <td style={{ padding: '10px 8px', color: '#555' }}>
                {item.remark || item.notes || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {remarks && (
        <div style={{
          background: '#f8faf8',
          border: '1px solid #e1ebe4',
          borderRadius: '6px',
          padding: '10px 14px',
          fontSize: '12px',
          marginBottom: '24px'
        }}>
          <strong>विशेष नोंद / शेरा:</strong> {remarks}
        </div>
      )}

      {/* RECEIPT ACKNOWLEDGMENT & SIGNATURES */}
      <div style={{
        marginTop: '30px',
        borderTop: '1px dashed #b8ccbe',
        paddingTop: '20px'
      }}>
        <div style={{ fontSize: '11px', color: '#556b5c', marginBottom: '35px', fontStyle: 'italic' }}>
          * वरील नमूद केलेला सर्व माल व्यवस्थित व चांगल्या स्थितीत प्राप्त झाला.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ borderBottom: '1px solid #333', marginBottom: '6px', height: '35px' }}></div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#222' }}>
              माल स्वीकारणाऱ्याची सही (Receiver)
            </div>
            <div style={{ fontSize: '10.5px', color: '#666' }}>नाव व दिनांक</div>
          </div>

          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#176b3a', marginBottom: '35px' }}>
              स्वराज कृषी सेवा केंद्र करिता
            </div>
            <div style={{ borderBottom: '1px solid #333', marginBottom: '6px' }}></div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#222' }}>
              अधिकृत स्वाक्षरी / शिक्का
            </div>
            <div style={{ fontSize: '10.5px', color: '#666' }}>Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChallanTemplate;

