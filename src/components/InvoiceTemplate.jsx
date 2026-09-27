import React, { forwardRef } from 'react';
import LogoImg from '../images/sksklogo.png';
import { numberToMarathiWords } from '../service/billingService';

const InvoiceTemplate = forwardRef(({ bill }, ref) => {
  if (!bill) return null;

  const {
    billNo = 'SKSK-DRAFT',
    customerName = '',
    customerMobile = '',
    customerAddress = '',
    billDate = new Date().toISOString().split('T')[0],
    items = [],
    totalAmount = 0,
    paymentMode = 'Cash',
    notes = ''
  } = bill;

  // Format date to DD/MM/YYYY
  const formattedDate = (() => {
    try {
      const [y, m, d] = billDate.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return billDate;
    } catch (e) {
      return billDate;
    }
  })();

  const words = numberToMarathiWords(totalAmount);

  return (
    <div
      ref={ref}
      className="invoice-container"
      style={{
        width: '794px', // Standard A4 width in 96dpi pixels (210mm)
        minHeight: '1123px', // Standard A4 height (297mm)
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
      {/* ================= HEADER ================= */}
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
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#176b3a',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              ।। श्री गणेशाय नमः ।।
            </div>
            <h1 style={{
              margin: '2px 0 0',
              fontSize: '26px',
              fontWeight: '800',
              color: '#176b3a',
              lineHeight: '1.1'
            }}>
              स्वराज कृषी सेवा केंद्र
            </h1>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#2d4b35',
              letterSpacing: '0.4px'
            }}>
              SWARAJ KRUSHI SEVA KENDRA
            </div>
            <div style={{ fontSize: '11px', color: '#4a5d50', marginTop: '2px' }}>
              खते, बी-बियाणे, कीटकनाशके व आधुनिक कृषी सल्ला केंद्र
            </div>
          </div>
        </div>

        {/* Shop Contact & Info */}
        <div style={{
          textAlign: 'right',
          fontSize: '11px',
          color: '#34463a',
          lineHeight: '1.5'
        }}>
          <div>
            <strong>प्रोप्रायटर:</strong> निलेश त्र्यंबक दवंगे
          </div>
          <div>
            <strong>मोबाईल:</strong> +९१ ८४५९५६८९४०
          </div>
          <div style={{ maxWidth: '240px', marginTop: '2px' }}>
            मु. पो. कानमंडाळे, ता. चांदवड, जि. नाशिक (४२३११७)
          </div>
          <div style={{
            display: 'inline-block',
            marginTop: '4px',
            padding: '2px 6px',
            background: '#eaf5eb',
            color: '#176b3a',
            borderRadius: '4px',
            fontWeight: '600',
            fontSize: '10px'
          }}>
            GSTIN: Pending (लवकरच अद्यतनित)
          </div>
        </div>
      </div>

      {/* ================= BILL BANNER ================= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#f4f8f4',
        border: '1px solid #d2e4d4',
        borderRadius: '6px',
        padding: '8px 14px',
        marginBottom: '16px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div>
            <span style={{ color: '#55695a' }}>बिल क्र. (Bill No): </span>
            <strong style={{ color: '#176b3a', fontSize: '13px' }}>{billNo}</strong>
          </div>
          <div>
            <span style={{ color: '#55695a' }}>पेमेंट प्रकार: </span>
            <strong style={{ color: '#2d4b35' }}>{paymentMode}</strong>
          </div>
        </div>
        <div>
          <span style={{ color: '#55695a' }}>तारीख (Date): </span>
          <strong style={{ color: '#1a201c', fontSize: '13px' }}>{formattedDate}</strong>
        </div>
      </div>

      {/* ================= CUSTOMER INFO BOX ================= */}
      <div style={{
        border: '1px solid #dbe6dc',
        borderRadius: '6px',
        padding: '12px 16px',
        marginBottom: '18px',
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        gap: '12px',
        fontSize: '12px',
        background: '#fafcfa'
      }}>
        <div>
          <div style={{ color: '#5b6f60', fontSize: '11px', marginBottom: '2px' }}>ग्राहकाचे नाव (Customer Name):</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#14311d' }}>
            {customerName || '—'}
          </div>
          {customerAddress && (
            <div style={{ marginTop: '6px', color: '#4a5d50' }}>
              <span style={{ color: '#6e8173', fontSize: '11px' }}>पत्ता (Address): </span>
              {customerAddress}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#5b6f60', fontSize: '11px', marginBottom: '2px' }}>मोबाईल क्र. (Mobile Number):</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#14311d' }}>
            {customerMobile ? `+91 ${customerMobile}` : '—'}
          </div>
        </div>
      </div>

      {/* ================= ITEMS TABLE ================= */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '20px',
        fontSize: '12px'
      }}>
        <thead>
          <tr style={{ background: '#176b3a', color: '#ffffff' }}>
            <th style={{ padding: '8px 6px', textAlign: 'center', width: '45px', border: '1px solid #176b3a' }}>
              अ. क्र.
            </th>
            <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #176b3a' }}>
              मालाचा तपशील / उत्पादन (Product Name)
            </th>
            <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px', border: '1px solid #176b3a' }}>
              नग / प्रमाण
            </th>
            <th style={{ padding: '8px 10px', textAlign: 'right', width: '100px', border: '1px solid #176b3a' }}>
              दर / भाव (₹)
            </th>
            <th style={{ padding: '8px 12px', textAlign: 'right', width: '120px', border: '1px solid #176b3a' }}>
              एकूण रक्कम (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const qty = Number(item.qty) || 1;
            const price = Number(item.price) || 0;
            const lineTotal = Number(item.total) || qty * price;
            return (
              <tr
                key={index}
                style={{
                  background: index % 2 === 0 ? '#ffffff' : '#f9fbf9',
                  borderBottom: '1px solid #e1ebe2'
                }}
              >
                <td style={{ padding: '8px 6px', textAlign: 'center', border: '1px solid #e1ebe2', color: '#687b6d' }}>
                  {index + 1}
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #e1ebe2', fontWeight: '600', color: '#192b1e' }}>
                  {item.name}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #e1ebe2' }}>
                  {qty} {item.unit || 'नग'}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #e1ebe2' }}>
                  ₹ {price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e1ebe2', fontWeight: '700' }}>
                  ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}

          {/* Fill empty rows to make receipt look well-proportioned if few items */}
          {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ height: '28px', borderBottom: '1px solid #f0f4f1' }}>
              <td style={{ border: '1px solid #eef3ef' }}></td>
              <td style={{ border: '1px solid #eef3ef' }}></td>
              <td style={{ border: '1px solid #eef3ef' }}></td>
              <td style={{ border: '1px solid #eef3ef' }}></td>
              <td style={{ border: '1px solid #eef3ef' }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= TOTAL & WORDS ================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '16px',
        marginBottom: '26px'
      }}>
        {/* Words / Note */}
        <div style={{
          border: '1px dashed #c0d8c4',
          borderRadius: '6px',
          padding: '10px 14px',
          background: '#f8fbf8',
          fontSize: '11px'
        }}>
          <div style={{ color: '#506755', fontWeight: '600', marginBottom: '3px' }}>
            अक्षरी रक्कम (Amount in words):
          </div>
          <div style={{ fontWeight: '700', color: '#134023', fontSize: '12px' }}>
            {words}
          </div>
          {notes && (
            <div style={{ marginTop: '8px', color: '#55695b' }}>
              <strong>नोंद:</strong> {notes}
            </div>
          )}
        </div>

        {/* Calculation Table */}
        <div style={{
          border: '1px solid #cce0d0',
          borderRadius: '6px',
          overflow: 'hidden',
          fontSize: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: '#ffffff',
            borderBottom: '1px solid #e1ede3'
          }}>
            <span style={{ color: '#546b5a' }}>उप-एकूण (Subtotal):</span>
            <strong>₹ {Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: '#176b3a',
            color: '#ffffff',
            fontSize: '14px'
          }}>
            <span style={{ fontWeight: '700' }}>एकूण रक्कम (Grand Total):</span>
            <span style={{ fontWeight: '800', fontSize: '16px' }}>
              ₹ {Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* ================= TERMS & SIGNATURE ================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '20px',
        borderTop: '1px solid #d2e4d4',
        paddingTop: '16px',
        fontSize: '10.5px',
        color: '#475a4c'
      }}>
        {/* Terms */}
        <div>
          <strong style={{ color: '#1c3622', display: 'block', marginBottom: '4px' }}>
            नियम व अटी (Terms & Conditions):
          </strong>
          <ol style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
            <li>विकलेला माल कोणत्याही परिस्थितीत परत घेतला जाणार नाही.</li>
            <li>खत व औषधांचा वापर कृषी तज्ज्ञांच्या सल्ल्यानेच करावा.</li>
            <li>बिलाशिवाय मालाची कोणतीही तक्रार ग्राह्य धरली जाणार नाही.</li>
          </ol>
        </div>

        {/* Signatures */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          textAlign: 'right'
        }}>
          <div>
            <div style={{ fontWeight: '700', color: '#176b3a', fontSize: '11px' }}>
              स्वराज कृषी सेवा केंद्र करिता
            </div>
            <div style={{ color: '#687e6e', fontSize: '9.5px' }}>
              (For Swaraj Krushi Seva Kendra)
            </div>
          </div>

          <div style={{ marginTop: '40px', borderTop: '1px dashed #7a9480', paddingTop: '4px', minWidth: '150px', textAlign: 'center' }}>
            <span style={{ fontWeight: '600', fontSize: '10px', color: '#273f2e' }}>
              अधिकृत स्वाक्षरी (Auth. Signatory)
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '42px',
        right: '42px',
        textAlign: 'center',
        fontSize: '9.5px',
        color: '#718776',
        borderTop: '1px solid #edf4ee',
        paddingTop: '6px'
      }}>
        🌱 धन्यवाद! पुन्हा भेट द्या. • आपले समाधान हीच आमची खरी प्रगती! 🌱
      </div>
    </div>
  );
});

export default InvoiceTemplate;
