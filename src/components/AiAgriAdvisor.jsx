import React, { useState, useRef, useEffect } from 'react';
import { askAgriAdvisor, detectCrop } from '../service/aiAgriService';
import ShopProp from '../config/shopProps';
import '../CSS/aiAdvisor.css';

const SESSION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes inactivity timeout

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
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

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

export default function AiAgriAdvisor() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `🌱 राम राम शेतकरी मित्रांनो! 🙏\n\nमी स्वराज कृषी सेवा केंद्राचा अधिकृत AI कृषी मित्र आहे.\nआपल्या पिकावरील रोग, अळी, किंवा खत व्यवस्थापनाविषयी थेट विचारा.\n\n• पिकाचा प्रश्न टाईप करा, बोला (🎙️) किंवा फोटो (📷) पाठवा.\n• आम्ही सर्व औषधे घरपोच डिलिव्हरी (Home Delivery) देखील करतो!\n\n💡 तुम्ही आधीच स्वराज कृषी सेवा केंद्रातून औषध खरेदी केले आहे का?\nवापर कसा करावा किंवा पाण्याचे प्रमाण आठवत नसेल तर खाली तुमचा १०-अंकी मोबाईल नंबर किंवा औषधाचे नाव टाका — मी पाण्याचे प्रमाण व डोस लगेच समजावून सांगेन!`,
      image: null
    }
  ]);

  // Session context to maintain conversation continuity for 2 minutes
  const [sessionContext, setSessionContext] = useState({
    activeCrop: null,
    lastActivityTime: Date.now(),
    history: []
  });

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // { base64, mimeType, dataUrl }
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Setup Web Speech API for voice input
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'mr-IN'; // Defaults to Marathi (can also understand Hindi / English)

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Toggle Voice Recording
  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      alert('तुमच्या ब्राउझरमध्ये व्हॉइस रेकॉर्डिंग सपोर्ट उपलब्ध नाही. कृपया गुगल क्रोम वापरा किंवा मजकूर टाईप करा.');
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

  // Handle Image Upload
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      alert('कृपया ४ MB पेक्षा लहान आकाराचा फोटो निवडा.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      setSelectedImage({
        dataUrl,
        base64,
        mimeType: file.type || 'image/jpeg'
      });
    };
    reader.readAsDataURL(file);
  };

  // Submit Query
  const handleSendMessage = async (customText = null) => {
    const query = (customText || inputText).trim();
    if (!query && !selectedImage) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: query || '📷 (पिकाचा फोटो विश्लेषणासाठी पाठवला आहे)',
      image: selectedImage?.dataUrl || null
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setIsThinking(true);

    // 2-minute Session Inactivity Check
    const now = Date.now();
    const isSessionExpired = now - sessionContext.lastActivityTime > SESSION_TIMEOUT_MS;

    let activeCrop = isSessionExpired ? null : sessionContext.activeCrop;
    let historyToPass = isSessionExpired ? [] : sessionContext.history;

    const detected = detectCrop(query);
    if (detected) {
      activeCrop = detected;
    }

    const contextToSend = {
      activeCrop,
      isFollowUp: !detected && !!activeCrop
    };

    try {
      const reply = await askAgriAdvisor(
        query || 'कृपया या फोटोतील पिकाची पाहणी करून कीड, रोग आणि त्यावर स्वराज कृषी सेवा केंद्रातील योग्य उपाय सांगा.',
        imageToSend?.base64,
        imageToSend?.mimeType,
        contextToSend,
        historyToPass
      );

      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: reply,
        image: null,
        referralQuestion: query
      };

      setMessages((prev) => [...prev, botMessage]);

      // Update session context with current crop & latest activity time
      const resolvedCrop = detected || activeCrop || detectCrop(reply);
      setSessionContext({
        activeCrop: resolvedCrop,
        lastActivityTime: Date.now(),
        history: [
          ...historyToPass,
          { sender: 'user', text: query || '📷 (पिकाचा फोटो)' },
          { sender: 'bot', text: reply }
        ].slice(-6)
      });
    } catch (err) {
      console.error('Advisor error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'माफ करा, तांत्रिक समस्येमुळे उत्तर मिळण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा किंवा थेट निलेश दवंगे (+91 8459568940) यांच्याशी संपर्क साधा.'
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Quick Suggestion Chips
  const suggestions = [
    '🍅 टोमॅटो अळी व कीड उपाय',
    '🍇 द्राक्ष बाग रोग उपाय',
    '🧅 कांदा करपा व थ्रिप्स',
    '🚚 घरपोच डिलिव्हरी (Home Delivery)',
    '📱 खरेदी केलेल्या औषधाचा वापर'
  ];

  return (
    <div className="ai-advisor-card">
      {/* Top Header */}
      <div className="ai-advisor-header">
        <div className="ai-advisor-title-group">
          <div className="ai-avatar-badge">
            🌱
          </div>
          <div className="ai-title-text">
            <h3>
              AI कृषी मित्र (Agri Advisor)
            </h3>
            <p>
              पिकांवरील रोग, खते व औषधांबद्दल थेट विचारा
            </p>
          </div>
        </div>

        <span className="ai-lang-pill">
          मराठी • हिंदी • Eng
        </span>
      </div>

      {/* Messages Stream */}
      <div className="ai-messages-container">
        {messages.map((m) => (
          <div key={m.id} className={`ai-bubble ${m.sender}`}>
            {m.image && (
              <img src={m.image} alt="Crop Upload" className="ai-bubble-image-preview" />
            )}
            <FormattedAiText text={m.text} />

            {/* Direct WhatsApp connect with Owner Nilesh Davange */}
            {m.sender === 'bot' && m.id !== 1 && (
              <div className="ai-whatsapp-referral">
                <a
                  href={`https://wa.me/${ShopProp.whatsapp || '918459568940'}?text=${encodeURIComponent(
                    `नमस्कार निलेश दादा, मी स्वराज कृषी सेवा केंद्र वेबसाइटवरील AI कृषी मित्राकडे खालील सल्ला विचारला होता:\n\n"${m.referralQuestion || 'शेती सल्ला'}"\n\nमला यावर अचूक मार्गदर्शन व औषधे हवी आहेत.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ai-wa-contact"
                >
                  💬 निलेश दवंगे यांना WhatsApp वर विचारा
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

        <div ref={messagesEndRef} />
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

      {/* Selected Image Preview Bar before sending */}
      {selectedImage && (
        <div className="ai-attached-image-bar">
          <img src={selectedImage.dataUrl} alt="Thumbnail" className="ai-thumbnail" />
          <span style={{ fontSize: '11.5px', color: '#176b3a', fontWeight: '600' }}>
            पिकाचा फोटो जोडला आहे
          </span>
          <button
            type="button"
            className="btn-remove-attachment"
            onClick={() => setSelectedImage(null)}
            title="फोटो काढा"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input Bar: Audio + Image + Text */}
      <form
        className="ai-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        {/* Hidden File Input for Image/Camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />

        {/* Image Attachment Button */}
        <button
          type="button"
          className="btn-ai-icon"
          onClick={() => fileInputRef.current?.click()}
          title="पिकाचा किंवा पानावरील रोगाचा फोटो पाठवा"
        >
          📷
        </button>

        {/* Audio Mic Button */}
        <button
          type="button"
          className={`btn-ai-icon ${isRecording ? 'recording' : ''}`}
          onClick={handleToggleVoice}
          title={isRecording ? 'रेकॉर्डिंग थांबवा' : 'बोलून प्रश्न विचारा (मराठी/हिंदी)'}
        >
          {isRecording ? '🛑' : '🎙️'}
        </button>

        {/* Text Input */}
        <input
          type="text"
          className="ai-input-text"
          placeholder={isRecording ? '🎙️ ऐकत आहे, बोला...' : 'पिकाचा प्रश्न विचारा किंवा खरेदी बिलाचा मोबाईल नंबर टाका...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isThinking}
        />

        {/* Send Button */}
        <button
          type="submit"
          className="btn-ai-send"
          disabled={isThinking || (!inputText.trim() && !selectedImage)}
          title="पाठवा"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
