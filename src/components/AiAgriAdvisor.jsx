import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  askAgriAdvisor,
  getOpenAIKey,
  getSelectedAiModel
} from '../service/aiAgriService';
import ShopProp from '../config/shopProps';
import { getShopInfo } from '../service/shopService';
import '../CSS/aiAdvisor.css';

// Formats plain text, converts any **bold** into <strong>, cleans stray asterisks, and renders clean paragraphs
function FormattedAiText({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="ai-bubble-text">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="ai-empty-line" />;
        }

        const cleanLine = line.replace(/^###\s*/, '');
        const parts = cleanLine.split(/(\*[\s\S]*?\*)/g);

        return (
          <div key={lineIdx} className="ai-text-line">
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                return (
                  <strong key={partIdx} className="ai-text-bold">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              const stripped = part.replace(/\*\*/g, '');
              return <React.Fragment key={partIdx}>{stripped}</React.Fragment>;
            })}
          </div>
        );
      })}
    </div>
  );
}

const SESSION_CHAT_KEY = 'swaraj_ai_advisor_chat_session_v1';

export default function AiAgriAdvisor() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      // ignore parsing error
    }
    return [
      {
        id: 1,
        sender: 'bot',
        text: `🌱 राम राम शेतकरी मित्रांनो! 🙏\n\nमी स्वराज कृषी सेवा केंद्राचा अधिकृत AI कृषी सल्लागार आहे.\nआपल्या पिकावरील रोग, अळी, किंवा खत व्यवस्थापनाविषयी थेट विचारा.\n\n• पिकाचा प्रश्न टाईप करा, बोला (🎙️), फोटो (📷) किंवा दस्तऐवज (📎) जोडा.\n💡 तुम्ही आधीच स्वराज कृषी सेवा केंद्रातून औषध खरेदी केले आहे का?\nवापर कसा करावा किंवा पाण्याचे प्रमाण आठवत नसेल तर खाली तुमचा १०-अंकी मोबाईल नंबर टाका — मी खरेदीचे बिल व डोस लगेच समजावून सांगेन!`,
        image: null,
        attachment: null
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync messages with sessionStorage to persist active chat session across view changes
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_CHAT_KEY, JSON.stringify(messages));
    } catch (err) {
      // quota fallback
    }
  }, [messages]);

  // Lock background scrolling and allow ESC key to minimize when expanded
  useEffect(() => {
    if (!isExpanded) return undefined;

    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  // Ensure scroll is positioned at the latest message whenever expanded view toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 90);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  const openAiKey = getOpenAIKey();
  const selectedModel = getSelectedAiModel();
  const [aiServiceOnline, setAiServiceOnline] = useState(null); // null=checking, true=online, false=offline

  const messagesContainerRef = useRef(null);
  const photoInputRef = useRef(null);
  const docInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const hasMountedMessagesRef = useRef(false);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!hasMountedMessagesRef.current) {
      hasMountedMessagesRef.current = true;
      return;
    }
    scrollToBottom();
  }, [messages, isThinking]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'mr-IN';

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, []);

  // Check AI service availability on mount
  useEffect(() => {
    let cancelled = false;
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const hasKey = Boolean(openAiKey?.trim().length > 10 || geminiKey?.trim().length > 10);
    if (!hasKey) {
      setAiServiceOnline(false);
      console.error('[AI Krushi Mitr] No API key configured. Set VITE_GEMINI_API_KEY in .env.local');
      return;
    }
    // Quick ping — small request to check reachability
    const model = 'gemini-flash-lite-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 5 } })
    })
      .then(r => {
        clearTimeout(t);
        if (!cancelled) {
          if (r.ok || r.status === 400) { // 400 = bad request but service is reachable
            setAiServiceOnline(true);
          } else {
            setAiServiceOnline(false);
            console.error(`[AI Krushi Mitr] Service check failed: HTTP ${r.status}`);
          }
        }
      })
      .catch(err => {
        clearTimeout(t);
        if (!cancelled) {
          setAiServiceOnline(false);
          console.error('[AI Krushi Mitr] Service unreachable:', err.message);
        }
      });
    return () => { cancelled = true; clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      alert('ब्राउझरमध्ये व्हॉइस इनपुट उपलब्ध नाही. कृपया गुगल क्रोम वापरा किंवा मजकूर टाईप करा.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current.stop();
      }
    }
  };

  const handleFileProcess = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('कृपया १० MB पेक्षा लहान फाईल निवडा.');
      return;
    }

    const isImg = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isText = file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.csv');

    if (isText) {
      const textReader = new FileReader();
      textReader.onload = () => {
        setSelectedAttachment({
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          isImage: false,
          isPdf: false,
          textContent: textReader.result ? String(textReader.result).slice(0, 8000) : '',
          dataUrl: null
        });
      };
      textReader.readAsText(file);
    } else {
      const urlReader = new FileReader();
      urlReader.onload = () => {
        setSelectedAttachment({
          name: file.name,
          size: file.size,
          type: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
          isImage: isImg,
          isPdf: isPdf,
          dataUrl: urlReader.result,
          textContent: null
        });
      };
      urlReader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (customText = null) => {
    const query = (customText || inputText).trim();
    if (!query && !selectedAttachment) return;

    const currentAttachment = selectedAttachment;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: query || (currentAttachment ? `📎 ${currentAttachment.name} फाईल पाठवली` : '📷 (पिकाचा फोटो पाठवला आहे)'),
      image: currentAttachment?.isImage ? currentAttachment.dataUrl : null,
      attachment: currentAttachment
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSelectedAttachment(null);
    setIsThinking(true);

    try {
      // Pass the complete session message history for contextual awareness
      const reply = await askAgriAdvisor(
        query || (currentAttachment ? 'कृपया सोबत जोडलेली फाईल तपासून माहिती व योग्य सल्ला द्या.' : ''),
        messages,
        {
          model: selectedModel,
          attachment: currentAttachment,
          image: currentAttachment?.isImage ? currentAttachment : null
        }
      );

      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: reply,
        image: null,
        attachment: null,
        referralQuestion: query
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Advisor error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: `AI response failed: ${err.message || 'Please try again.'}`
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const getSuggestions = () => [
    'How can I improve soil health?',
    'Help me identify a crop problem',
    'Explain drip irrigation basics',
    'What should I know before spraying?'
  ];
  const suggestions = getSuggestions();

  // Status dot computation:
  // - Yellow: while testing connection on mount (aiServiceOnline === null) OR while generating answer (isThinking === true)
  // - Green: when connected and idle (aiServiceOnline === true && !isThinking)
  // - Red: when offline or error (!isThinking && aiServiceOnline === false)
  const isYellow = isThinking || aiServiceOnline === null;
  const isGreen = !isThinking && aiServiceOnline === true;
  const isRed = !isThinking && aiServiceOnline === false;

  const dotColor = isYellow ? '#fbbc04' : (isGreen ? '#34a853' : '#ea4335');
  const dotShadow = isYellow
    ? '0 0 0 2px #fde9a2'
    : (isGreen ? '0 0 0 2px #ceead6' : '0 0 0 2px #fcd0cf');
  const dotTitle = isThinking
    ? 'उत्तर शोधत आहे... (कृपया प्रतीक्षा करा)'
    : (aiServiceOnline === null
      ? 'AI कनेक्शन तपासत आहे...'
      : (isGreen ? 'AI सेवा चालू आहे (तयार)' : 'AI सेवा बंद आहे / समस्या'));

  const cardContent = (
    <div
      className={`ai-advisor-card ${isExpanded ? 'is-fullscreen-card' : ''}`}
    >
      {/* Top Header */}
      <div className="ai-advisor-header">
        <div className="ai-advisor-title-group">
          <div className="ai-avatar-badge">🌱</div>
          <div className="ai-title-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>AI कृषी मित्र</h3>
              <span
                title={dotTitle}
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: dotColor,
                  boxShadow: dotShadow,
                  transition: 'background 0.3s, box-shadow 0.3s'
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#b5d8be' }}>
              पिकांवरील रोग, खते व औषधांबद्दल अचूक सल्ला
            </p>
          </div>
        </div>

        {/* Expand / Minimize Symbol Button (Symbol only) */}
        <button
          type="button"
          className="ai-expand-btn"
          onClick={() => {
            setIsExpanded((prev) => !prev);
          }}
          title={isExpanded ? 'लहान करा (Minimize)' : 'मोठे करा (Expand)'}
          aria-label={isExpanded ? 'Minimize chat' : 'Maximize chat'}
        >
          {isExpanded ? (
            /* Minimize symbol (Symbol only) */
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          ) : (
            /* Expand symbol (Symbol only) */
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>
      </div>

      {/* Messages Stream */}
      <div className="ai-messages-container" ref={messagesContainerRef}>
        {messages.map((m) => (
          <div key={m.id} className={`ai-bubble ${m.sender}`}>
            {/* If message has an image */}
            {(m.attachment?.isImage || m.image) && (
              <img
                src={m.attachment?.dataUrl || m.image}
                alt="Upload Preview"
                className="ai-bubble-image-preview"
              />
            )}

            {/* If message has a document attachment (PDF, text, doc) */}
            {m.attachment && !m.attachment.isImage && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(23, 107, 58, 0.1)', border: '1px solid #cce3d4',
                padding: '6px 12px', borderRadius: '8px', marginBottom: '8px',
                fontSize: '12.5px', color: '#176b3a', maxWidth: '100%'
              }}>
                <span style={{ fontSize: '18px' }}>{m.attachment.isPdf ? '📕' : '📄'}</span>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong>{m.attachment.name}</strong>
                  <div style={{ fontSize: '11px', color: '#65776d' }}>
                    {Math.round((m.attachment.size || 0) / 1024)} KB • {m.attachment.isPdf ? 'PDF दस्तऐवज' : 'दस्तऐवज'}
                  </div>
                </div>
              </div>
            )}

            <FormattedAiText text={m.text} />

            {/* Direct WhatsApp connect with Owner from properties */}
            {m.sender === 'bot' && m.id !== 1 && (
              <div className="ai-whatsapp-referral">
                <a
                  href={`https://wa.me/${getShopInfo().whatsapp || ShopProp.whatsapp || '918459568940'}?text=${encodeURIComponent(
                    `नमस्कार ${getShopInfo().ownerName || 'निलेश दादा'}, मी ${getShopInfo().fullName || 'स्वराज कृषी सेवा केंद्र'} वेबसाइटवरील AI कृषी मित्राकडे खालील सल्ला विचारला होता:\n\n"${m.referralQuestion || 'शेती सल्ला'}"\n\nमला यावर अचूक मार्गदर्शन व औषधे हवी आहेत.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ai-wa-contact"
                >
                  💬 {getShopInfo().ownerName || 'निलेश दवंगे'} यांना WhatsApp वर विचारा
                </a>
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="ai-thinking">
            <span>🌱 AI कृषी मित्र विचार करत आहे</span>
            <div className="ai-thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="ai-suggestions-row">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            className="ai-chip"
            onClick={() => handleSendMessage(s)}
            disabled={isThinking}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Selected Attachment Preview Bar before sending */}
      {selectedAttachment && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 12px', background: '#eaf5ed', borderRadius: '10px',
          border: '1px solid #cce3d4', margin: '0 12px 8px 12px'
        }}>
          {selectedAttachment.isImage ? (
            <img
              src={selectedAttachment.dataUrl}
              alt="Thumbnail"
              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }}
            />
          ) : (
            <span style={{ fontSize: '24px' }}>{selectedAttachment.isPdf ? '📕' : '📄'}</span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '12.5px', color: '#176b3a', fontWeight: '700',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {selectedAttachment.name}
            </div>
            <div style={{ fontSize: '11px', color: '#65776d' }}>
              {Math.round((selectedAttachment.size || 0) / 1024)} KB • {selectedAttachment.isImage ? 'फोटो' : (selectedAttachment.isPdf ? 'PDF' : 'दस्तऐवज')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedAttachment(null)}
            title="काढून टाका"
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: '16px', color: '#c53030', padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input Bar: Audio + Attachment (Document/Image) + Camera + Text */}
      <form
        className="ai-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        {/* Hidden File Input for Documents & Images */}
        <input
          ref={docInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileProcess(f);
            e.target.value = '';
          }}
        />

        {/* Hidden File Input for Camera direct capture */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileProcess(f);
            e.target.value = '';
          }}
        />

        {/* Action Buttons: Attachment, Photo, Voice */}
        <div className="ai-input-actions-row">
          {/* Document / Any File Attachment Button */}
          <button
            type="button"
            className="btn-ai-icon"
            onClick={() => docInputRef.current?.click()}
            title="दस्तऐवज किंवा फोटो जोडा (PDF, Word, Text, Image)"
            disabled={isThinking}
          >
            📎
          </button>

          {/* Camera / Photo Button */}
          <button
            type="button"
            className="btn-ai-icon"
            onClick={() => photoInputRef.current?.click()}
            title="पिकाचा फोटो काढा किंवा अपलोड करा"
            disabled={isThinking}
          >
            📷
          </button>

          {/* Voice Input Button */}
          <button
            type="button"
            className={`btn-ai-icon ${isRecording ? 'recording' : ''}`}
            onClick={handleToggleVoice}
            title={isRecording ? 'रेकॉर्डिंग थांबवा' : 'बोलून प्रश्न विचारा (मराठी/हिंदी)'}
            disabled={isThinking}
          >
            {isRecording ? '🛑' : '🎙️'}
          </button>
        </div>

        {/* Input Text Field & Send Button */}
        <div className="ai-input-field-row">
          <input
            type="text"
            className="ai-input-text"
            placeholder={isRecording ? '🎙️ ऐकत आहे, बोला...' : 'पिकाचा प्रश्न विचारा किंवा खरेदी बिलाचा मोबाईल नंबर टाका...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isThinking}
          />

          <button
            type="submit"
            className="btn-ai-send"
            disabled={isThinking || (!inputText.trim() && !selectedAttachment)}
            title="पाठवा"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );

  if (isExpanded) {
    return (
      <>
        {/* Hero placeholder so page underneath remains steady without layout jumps */}
        <div
          className="ai-advisor-card ai-advisor-placeholder"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            textAlign: 'center',
            background: '#f4f9f5',
            border: '2px dashed #9bc8a3',
            borderRadius: '28px',
            height: '520px',
            boxShadow: 'none'
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🌱</div>
          <h4 style={{ margin: '0 0 8px', color: '#176b3a', fontSize: '18px', fontWeight: '800' }}>
            AI कृषी मित्र पूर्ण स्क्रीनमध्ये सुरू आहे
          </h4>
          <p style={{ margin: '0 0 16px', color: '#556b5a', fontSize: '13px' }}>
            चॅट विंडो सध्या पूर्ण स्क्रीनमध्ये उघडली आहे.
          </p>
          <button
            type="button"
            className="ai-expand-btn"
            onClick={() => setIsExpanded(false)}
            title="लहान करा (Minimize)"
            aria-label="Minimize chat"
            style={{
              display: 'inline-flex',
              background: '#176b3a',
              color: '#ffffff',
              border: 'none',
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(23,107,58,0.25)'
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>

        {/* Edge-to-edge Fullscreen Popup Modal Portaled to document.body */}
        {typeof document !== 'undefined' &&
          createPortal(
            <div className="ai-fullscreen-portal-overlay">
              {cardContent}
            </div>,
            document.body
          )}
      </>
    );
  }

  return cardContent;
}
