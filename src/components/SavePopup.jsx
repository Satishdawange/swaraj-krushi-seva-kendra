import React, { useState, useEffect } from 'react';

/**
 * Global helper to trigger the Save Popup from anywhere in the app
 * 
 * Usage:
 * triggerSavePopup({
 *   title: 'बिल यशस्वीरीत्या सेव्ह झाले! 🎉',
 *   message: 'बिल क्र. SK-0012 Google Sheet व स्थानिक डेटाबेसमध्ये सेव्ह झाले.',
 *   details: [
 *     { label: 'ग्राहक', value: 'रमेश पाटील' },
 *     { label: 'एकूण रक्कम', value: '₹ 1,500' }
 *   ],
 *   actions: [
 *     { label: '💬 WhatsApp', onClick: () => {...}, primary: true }
 *   ]
 * });
 */
export function triggerSavePopup({
  title = 'माहिती यशस्वीरीत्या सेव्ह झाली! ✓',
  message = '',
  type = 'success',
  details = [],
  actions = [],
  duration = 6000
} = {}) {
  window.dispatchEvent(
    new CustomEvent('sksk-save-popup', {
      detail: {
        title,
        message,
        type,
        details,
        actions,
        duration,
        id: Date.now()
      }
    })
  );
}

export default function SavePopup() {
  const [popupData, setPopupData] = useState(null);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const handlePopupEvent = (e) => {
      const data = e.detail;
      if (!data) return;
      setPopupData(data);
      setProgress(100);
    };

    window.addEventListener('sksk-save-popup', handlePopupEvent);
    return () => {
      window.removeEventListener('sksk-save-popup', handlePopupEvent);
    };
  }, []);

  useEffect(() => {
    if (!popupData) return;

    const duration = popupData.duration || 6000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          setPopupData(null);
          return 0;
        }
        return Math.max(0, prev - step);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [popupData]);

  if (!popupData) return null;

  const handleClose = () => {
    setPopupData(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(34, 163, 90, 0.2)',
          border: '2px solid #22a35a',
          overflow: 'hidden',
          position: 'relative',
          animation: 'scaleUp 0.25s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with vibrant green gradient */}
        <div
          style={{
            background: 'linear-gradient(135deg, #176b3a 0%, #22a35a 100%)',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.25)',
                fontSize: '18px'
              }}
            >
              ✓
            </span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', letterSpacing: '0.2px' }}>
              {popupData.title || 'यशस्वीरीत्या सेव्ह झाले!'}
            </h3>
          </div>

          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px 8px',
              borderRadius: '6px',
              opacity: 0.85
            }}
            title="बंद करा"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {popupData.message && (
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: '#2d3748',
                lineHeight: 1.5,
                fontWeight: '600'
              }}
            >
              {popupData.message}
            </p>
          )}

          {/* Key-Value Details Cards (if any) */}
          {Array.isArray(popupData.details) && popupData.details.length > 0 && (
            <div
              style={{
                background: '#f8faf9',
                border: '1px solid #dce8de',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px'
              }}
            >
              {popupData.details.map((d, idx) => (
                <div key={idx} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: '#65776d', fontWeight: '700', textTransform: 'uppercase' }}>
                    {d.label}
                  </div>
                  <div
                    style={{
                      fontSize: '13.5px',
                      color: '#134023',
                      fontWeight: '800',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {d.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'flex-end',
              marginTop: '10px'
            }}
          >
            {Array.isArray(popupData.actions) &&
              popupData.actions.map((act, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (act.onClick) act.onClick();
                    if (act.closeOnClick !== false) handleClose();
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: act.primary ? 'none' : '1px solid #cbd5e0',
                    background: act.primary
                      ? (act.bg || '#176b3a')
                      : '#ffffff',
                    color: act.primary ? '#ffffff' : '#2d3748',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: act.primary ? '0 2px 6px rgba(23,107,58,0.2)' : 'none'
                  }}
                >
                  {act.label}
                </button>
              ))}

            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#e2e8f0',
                color: '#2d3748',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ठीक आहे (OK)
            </button>
          </div>
        </div>

        {/* Auto-Dismiss Progress Line */}
        <div style={{ height: '3.5px', background: '#e2e8f0', width: '100%' }}>
          <div
            style={{
              height: '100%',
              background: '#22a35a',
              width: `${progress}%`,
              transition: 'width 50ms linear'
            }}
          />
        </div>
      </div>
    </div>
  );
}

