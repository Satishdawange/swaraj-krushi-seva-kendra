import React, { useState, useEffect } from 'react';
import {
  BadgeCheck,
  BookOpen,
  MessageCircle,
  Search,
  Sprout,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PhoneCall,
  ArrowLeft,
  CheckCircle2
} from '../components/Icons';
import { fetchAllServices, fetchAllSheetSettings } from '../service/googleSheetsService';
import { DEFAULT_SERVICE_IMAGE } from '../data/consultancyServices';
import { getShopInfo, getSettingValue } from '../service/shopService';

// General Shop Services
const generalServices = [
  [
    'उत्पादन निवड मार्गदर्शन',
    'पिकाची गरज, समस्या आणि उपलब्ध पर्याय समजून योग्य उत्पादन निवडण्यात मदत.',
    'Search'
  ],
  [
    'पिकानुसार माहिती',
    'किड, रोग, तण आणि पोषणाशी संबंधित मूलभूत माहिती व उत्पादन श्रेणी समजावून सांगणे.',
    'BookOpen'
  ],
  [
    'WhatsApp चौकशी',
    'उत्पादनाचे नाव पाठवून उपलब्धता व किंमतीबाबत दुकानाशी थेट संपर्क.',
    'MessageCircle'
  ],
  [
    'उत्पादन शोध सुविधा',
    'वेबसाइटवर उत्पादनाचे नाव, कंपनी किंवा श्रेणीने सहज शोध.',
    'ClipboardCheck'
  ],
  [
    'जबाबदार वापराची आठवण',
    'लेबलवरील सूचना, सुरक्षितता आणि तज्ज्ञांच्या सल्ल्याचे महत्त्व.',
    'BadgeCheck'
  ],
  [
    'शेती-केंद्रित सेवा',
    'दैनंदिन कृषी गरजांसाठी सोपी, स्थानिक आणि विश्वासू सेवा.',
    'Sprout'
  ]
];

const generalIcons = {
  Search,
  BookOpen,
  MessageCircle,
  ClipboardCheck,
  BadgeCheck,
  Sprout
};

export default function Services() {
  const [consultancyList, setConsultancyList] = useState([]);
  const [showConsultancy, setShowConsultancy] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);

  const shop = getShopInfo();
  const whatsappNumber = shop.whatsapp || '918459568940';
  const shopPhone = shop.phone || '8459568940';

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Check setting directly from Google Sheets Settings tab live
        let isEnabled = true;
        try {
          const remoteSettings = await fetchAllSheetSettings();
          if (Array.isArray(remoteSettings) && remoteSettings.length > 0) {
            localStorage.setItem('sksk_sheet_settings_cache', JSON.stringify(remoteSettings));
            const found = remoteSettings.find((s) => {
              const k = String(s.key || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
              return k === 'showconsultancyservices' || k === 'showconsultancy' || k === 'consultancyservices';
            });
            if (found && found.value !== undefined) {
              const val = String(found.value).trim().toLowerCase();
              isEnabled = val !== 'false' && val !== 'no' && val !== '0' && val !== 'off' && val !== 'disable';
            }
          } else {
            const settingVal = getSettingValue('show_consultancy_services', 'true');
            isEnabled = String(settingVal).toLowerCase() !== 'false';
          }
        } catch {
          const settingVal = getSettingValue('show_consultancy_services', 'true');
          isEnabled = String(settingVal).toLowerCase() !== 'false';
        }

        setShowConsultancy(isEnabled);

        if (isEnabled) {
          const services = await fetchAllServices();
          // Filter to only show active & showOnPortal services, sorted
          const visible = (services || [])
            .filter((s) => s.showOnPortal !== false && s.isActive !== false)
            .sort((a, b) => (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99));
          setConsultancyList(visible);
        } else {
          setConsultancyList([]);
          setSelectedService(null);
        }
      } catch (err) {
        console.error('Failed to load consultancy services:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Slides for current service
  const currentSlides = selectedService
    ? (selectedService.slideshowImages || '')
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean)
    : [];
  const slideList = currentSlides.length > 0 ? currentSlides : [selectedService?.cardImageUrl || DEFAULT_SERVICE_IMAGE];

  // Auto slide change slideshow: rotates every 3.5 seconds when not paused
  useEffect(() => {
    if (!selectedService || slideList.length <= 1 || isSlidePaused) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slideList.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [selectedService, slideList.length, isSlidePaused]);

  const handleSelectService = (service) => {
    setSelectedService(service);
    setActiveSlideIndex(0);
    setIsSlidePaused(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToServices = () => {
    setSelectedService(null);
    setActiveSlideIndex(0);
    setIsSlidePaused(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevSlide = (e) => {
    e.stopPropagation();
    setActiveSlideIndex((prev) => (prev === 0 ? slideList.length - 1 : prev - 1));
  };

  const handleNextSlide = (e) => {
    e.stopPropagation();
    setActiveSlideIndex((prev) => (prev === slideList.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="simple-page" style={{ paddingBottom: '70px' }}>
      {/* ========================================================
          DEDICATED SERVICE DETAIL PAGE (Instead of Popup)
      ========================================================= */}
      {selectedService && showConsultancy ? (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '10px 20px 40px' }}>
          {/* Top Sticky/Prominent Back Button */}
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={handleBackToServices}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                color: '#176b3a',
                border: '1.5px solid #c7e3ce',
                borderRadius: '14px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(23, 107, 58, 0.08)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#eaf6ee';
                e.currentTarget.style.borderColor = '#176b3a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#c7e3ce';
              }}
            >
              <ArrowLeft style={{ width: '16px', height: '16px' }} />
              <span>← सर्व सेवांवर परत जा (Back to Services)</span>
            </button>
          </div>

          {/* Service Title & Crop Badge */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span
                style={{
                  background: '#eaf6ee',
                  color: '#176b3a',
                  fontWeight: 800,
                  fontSize: '13px',
                  padding: '5px 14px',
                  borderRadius: '99px',
                  border: '1px solid #c7e3ce'
                }}
              >
                🌱 {selectedService.crop || 'विशेष पीक सल्ला'}
              </span>
              <span
                style={{
                  background: '#fef7e6',
                  color: '#946300',
                  fontWeight: 700,
                  fontSize: '12px',
                  padding: '4px 12px',
                  borderRadius: '99px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Sparkles style={{ width: '12px', height: '12px' }} /> तज्ज्ञ मार्गदर्शन
              </span>
              {selectedService.nameEn && (
                <span style={{ fontSize: '14px', color: '#66736b', fontWeight: 600 }}>
                  ({selectedService.nameEn})
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#17221b', margin: '0 0 8px', lineHeight: 1.3 }}>
              {selectedService.nameMr}
            </h1>
          </div>

          {/* ========================================================
              AUTO SLIDE CHANGE SLIDESHOW
          ========================================================= */}
          <div
            onMouseEnter={() => setIsSlidePaused(true)}
            onMouseLeave={() => setIsSlidePaused(false)}
            style={{
              position: 'relative',
              height: '420px',
              background: '#0d2215',
              overflow: 'hidden',
              borderRadius: '24px',
              boxShadow: '0 20px 50px rgba(15, 40, 25, 0.15)',
              marginBottom: '32px'
            }}
          >
            <img
              src={slideList[activeSlideIndex] || DEFAULT_SERVICE_IMAGE}
              alt={`${selectedService.nameMr} Slide ${activeSlideIndex + 1}`}
              onError={(e) => {
                e.currentTarget.src = DEFAULT_SERVICE_IMAGE;
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'opacity 0.4s ease'
              }}
            />

            {/* Slide Counter & Auto Status Badge */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(6px)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: '99px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📸 {activeSlideIndex + 1} / {slideList.length} फोटो</span>
              {slideList.length > 1 && (
                <span style={{ opacity: 0.85, fontSize: '11px', color: '#b9dc68' }}>
                  • {isSlidePaused ? 'पॉज केले' : 'आपोआप बदलत आहे'}
                </span>
              )}
            </div>

            {/* Prev / Next Navigation Buttons */}
            {slideList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '16px',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.92)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    color: '#17221b',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                    transition: 'transform 0.2s'
                  }}
                  title="मागील फोटो"
                >
                  <ChevronLeft style={{ width: '24px', height: '24px' }} />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '16px',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.92)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    color: '#17221b',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                    transition: 'transform 0.2s'
                  }}
                  title="पुढील फोटो"
                >
                  <ChevronRight style={{ width: '24px', height: '24px' }} />
                </button>

                {/* Bullet Navigation Dots */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '8px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    padding: '6px 14px',
                    borderRadius: '99px'
                  }}
                >
                  {slideList.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSlideIndex(idx)}
                      style={{
                        width: activeSlideIndex === idx ? '26px' : '8px',
                        height: '8px',
                        borderRadius: '99px',
                        background: activeSlideIndex === idx ? '#b9dc68' : 'rgba(255,255,255,0.6)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.3s ease'
                      }}
                      title={`फोटो क्रमांक ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ========================================================
              SERVICE DETAILED CONTENT
          ========================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', marginBottom: '32px' }}>
            {/* Left Column: Descriptions & Guidance */}
            <div style={{ background: '#fff', border: '1px solid #dfe8e0', borderRadius: '20px', padding: '28px', boxShadow: '0 8px 24px rgba(24,68,43,0.04)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#176b3a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen style={{ width: '20px', height: '20px' }} /> कन्सल्टन्सी सविस्तर माहिती
              </h3>
              <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#27382f', margin: '0 0 16px', whiteSpace: 'pre-line' }}>
                {selectedService.descriptionMr}
              </p>
              {selectedService.descriptionEn && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e2ece4' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#66736b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    English Overview
                  </span>
                  <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#56665c', fontStyle: 'italic', margin: '4px 0 0' }}>
                    {selectedService.descriptionEn}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Key Benefits */}
            <div style={{ background: '#f8fbf9', border: '1px solid #d5e7d9', borderRadius: '20px', padding: '28px', boxShadow: '0 8px 24px rgba(24,68,43,0.04)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#176b3a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BadgeCheck style={{ width: '20px', height: '20px' }} /> या सेवेचे मुख्य फायदे व वैशिष्ट्ये
              </h3>
              {selectedService.keyBenefitsMr ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedService.keyBenefitsMr
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((benefit, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ color: '#20a55a', marginTop: '2px', flexShrink: 0 }}>
                          <CheckCircle2 style={{ width: '18px', height: '18px' }} />
                        </span>
                        <span style={{ fontSize: '14px', lineHeight: 1.6, color: '#334139' }}>
                          {benefit.replace(/^[•\-\*\d\.]+\s*/, '')}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p style={{ color: '#66736b', fontSize: '14px', margin: 0 }}>
                  उत्कृष्ट उत्पादन नियोजन, योग्य औषध मात्रा आणि खर्चात बचत.
                </p>
              )}
            </div>
          </div>

          {/* Farmer Success Story / Feedback */}
          {selectedService.farmerFeedback && (
            <div
              style={{
                background: 'linear-gradient(135deg, #fffdf2 0%, #fff9e6 100%)',
                border: '1.5px solid #fae8a4',
                borderRadius: '20px',
                padding: '24px 28px',
                marginBottom: '32px',
                boxShadow: '0 8px 24px rgba(218, 165, 32, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '22px' }}>🌾</span>
                <strong style={{ fontSize: '15px', color: '#825e00', fontWeight: 800 }}>
                  शेतकऱ्यांचा अनुभव व यशोगाथा (Farmer Success Story):
                </strong>
              </div>
              <blockquote
                style={{
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: 1.8,
                  color: '#4d3b07',
                  fontStyle: 'italic',
                  paddingLeft: '14px',
                  borderLeft: '3px solid #e0b024'
                }}
              >
                "{selectedService.farmerFeedback}"
              </blockquote>
            </div>
          )}

          {/* Bottom Action CTAs */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #dfe8e0',
              borderRadius: '20px',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#17221b' }}>
                ही कन्सल्टन्सी सेवा सुरू करायची आहे?
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#66736b' }}>
                अधिक माहिती, प्लॉट भेट किंवा वेळापत्रकासाठी आजच आमच्याशी संपर्क साधा.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                  `नमस्कार, मला स्वराज कृषी सेवा केंद्राच्या "${selectedService.nameMr}" बद्दल अधिक माहिती व कन्सल्टन्सी हवी आहे.`
                )}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#20a55a',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '12px 22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  boxShadow: '0 6px 18px rgba(32, 165, 90, 0.25)',
                  textDecoration: 'none'
                }}
              >
                <MessageCircle style={{ width: '18px', height: '18px' }} />
                <span>WhatsApp वर संपर्क साधा</span>
              </a>

              <a
                href={`tel:${shopPhone}`}
                style={{
                  background: '#eaf6ee',
                  color: '#176b3a',
                  border: '1px solid #c7e3ce',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <PhoneCall style={{ width: '16px', height: '16px' }} />
                <span>कॉल करा ({shopPhone})</span>
              </a>

              <button
                type="button"
                onClick={handleBackToServices}
                style={{
                  background: '#f2f5f3',
                  color: '#425449',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ← सर्व सेवा
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
            MAIN SERVICES LIST (Hero + Crop Cards + General)
        ========================================================= */
        <>
          {/* Page Hero */}
          <div className="page-hero">
            <span className="pill">🌾 आमच्या सेवा व कन्सल्टन्सी</span>
            <h1>उत्पादनापलीकडची विश्वासू शेती सेवा</h1>
            <p>
              शेतकऱ्याला योग्य तांत्रिक सल्ला, आधुनिक औषध व खत वेळापत्रक आणि योग्य पर्याय सहज मिळावा, हाच आमचा ध्यास.
            </p>
          </div>

          {/* Consultancy Services Section */}
          {showConsultancy && (
            <div style={{ maxWidth: '1150px', margin: '0 auto 60px', padding: '0 20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#eaf6ee',
                    color: '#176b3a',
                    padding: '6px 16px',
                    borderRadius: '99px',
                    fontSize: '13px',
                    fontWeight: 700,
                    marginBottom: '10px'
                  }}
                >
                  🌱 विशेष पीक सल्लागार सेवा (Crop Consultancy)
                </span>
                <h2 style={{ fontSize: '28px', color: '#17221b', margin: '6px 0 10px', fontWeight: 800 }}>
                  आमची पीक कन्सल्टन्सी (Crop Solutions)
                </h2>
                <p style={{ color: '#66736b', fontSize: '15px', maxWidth: '650px', margin: '0 auto' }}>
                  द्राक्ष, टोमॅटो, डाळिंब व कलिंगड पिकांसाठी छाटणी/लागवडीपासून ते विक्रमी काढणीपर्यंतचे खात्रीशीर मार्गदर्शन.
                </p>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#66736b' }}>
                  कन्सल्टन्सी सेवा लोड होत आहेत...
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '24px'
                  }}
                >
                  {consultancyList.map((service) => (
                    <div
                      key={service.id}
                      style={{
                        background: '#fff',
                        borderRadius: '24px',
                        border: '1px solid #dfe8e0',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 10px 30px rgba(24, 68, 43, 0.06)',
                        transition: 'transform 0.25s, box-shadow 0.25s',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleSelectService(service)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 18px 40px rgba(24, 68, 43, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(24, 68, 43, 0.06)';
                      }}
                    >
                      {/* Card Image */}
                      <div style={{ position: 'relative', height: '190px', background: '#eaf6ee', overflow: 'hidden' }}>
                        <img
                          src={service.cardImageUrl || DEFAULT_SERVICE_IMAGE}
                          alt={service.nameMr}
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_SERVICE_IMAGE;
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease'
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            background: 'rgba(23, 107, 58, 0.92)',
                            backdropFilter: 'blur(4px)',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '99px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}
                        >
                          {service.crop || 'पीक सल्ला'}
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '12px',
                            background: 'rgba(255, 255, 255, 0.92)',
                            color: '#176b3a',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Sparkles style={{ width: '12px', height: '12px' }} /> तज्ज्ञ सल्ला
                        </span>
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#17221b' }}>
                          {service.nameMr}
                        </h3>
                        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#176b3a', fontWeight: 600 }}>
                          {service.nameEn}
                        </p>
                        <p
                          style={{
                            margin: '0 0 18px',
                            fontSize: '13px',
                            color: '#66736b',
                            lineHeight: 1.6,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {service.descriptionMr}
                        </p>

                        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f0f4f1' }}>
                          <button
                            type="button"
                            style={{
                              width: '100%',
                              background: '#f2f8f3',
                              color: '#176b3a',
                              border: '1px solid #c7e3ce',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'background 0.2s'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectService(service);
                            }}
                          >
                            <span>माहिती व यशोगाथा पाहा</span>
                            <span>➜</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* General Services Grid */}
          <div style={{ maxWidth: '1150px', margin: '0 auto 40px', padding: '0 20px' }}>
            <h2 style={{ fontSize: '24px', color: '#17221b', textAlign: 'center', marginBottom: '28px', fontWeight: 800 }}>
              आमच्या सर्वसाधारण ग्राहक सेवा
            </h2>
            <div className="service-grid" style={{ padding: 0 }}>
              {generalServices.map(([title, description, iconName]) => {
                const Icon = generalIcons[iconName];
                return (
                  <div className="service-card" key={title}>
                    <span className="service-icon">
                      <Icon />
                    </span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Important Notice */}
          <div className="notice" style={{ maxWidth: '1110px' }}>
            <b>महत्त्वाची सूचना:</b>
            <span>
              कृषी रसायनांचा वापर करताना नेहमी उत्पादनाच्या लेबलवरील सूचना काळजीपूर्वक वाचाव्यात. योग्य प्रमाण, सुरक्षितता
              साधने आणि हवामानानुसार फवारणी करणे पिकांच्या आरोग्यासाठी आणि सुरक्षेसाठी अत्यंत आवश्यक आहे.
            </span>
          </div>
        </>
      )}
    </section>
  );
}
