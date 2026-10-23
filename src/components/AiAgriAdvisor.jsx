import React, { useState, useRef, useEffect } from 'react';
import {
  askAgriAdvisor,
  getOpenAIKey,
  getSelectedAiModel
} from '../service/aiAgriService';
import ShopProp from '../config/shopProps';
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
      text: `🌱 राम राम शेतकरी मित्रांनो! 🙏\n\nमी स्वराज कृषी सेवा केंद्राचा अधिकृत AI कृषी मित्र आहे (ChatGPT Powered).\nआपल्या पिकावरील रोग, अळी, किंवा खत व्यवस्थापनाविषयी थेट विचारा.\n\n• पिकाचा प्रश्न टाईप करा, बोला (🎙️) किंवा फोटो (📷) पाठवा.\n• आम्ही सर्व औषधे घरपोच डिलिव्हरी (Home Delivery) देखील करतो!\n\n💡 तुम्ही आधीच स्वराज कृषी सेवा केंद्रातून औषध खरेदी केले आहे का?\nवापर कसा करावा किंवा पाण्याचे प्रमाण आठवत नसेल तर खाली तुमचा १०-अंकी मोबाईल नंबर टाका — मी खरेदीचे बिल व डोस लगेच समजावून सांगेन!`,
      image: null
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const openAiKey = getOpenAIKey();
  const selectedModel = getSelectedAiModel();

  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
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

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('कृपया ४ MB पेक्षा लहान फोटो निवडा.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage({
        dataUrl: reader.result,
        mimeType: file.type || 'image/jpeg'
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (customText = null) => {
    const query = (customText || inputText).trim();
    if (!query && !selectedImage) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: query || '📷 (पिकाचा फोटो पाठवला आहे)',
      image: selectedImage?.dataUrl || null
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSelectedImage(null);
    setIsThinking(true);

    try {
      // Build conversation history
      const history = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
        image: m.image
      }));

      const reply = await askAgriAdvisor(
        query || 'कृपया या फोटोतील पिकाची पाहणी करून कीड, रोग आणि त्यावर योग्य उपाय सांगा.',
        history,
        { model: selectedModel, image: selectedImage }
      );

      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: reply,
        image: null,
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

  // Optional prompts help users get started without limiting the questions they can ask.
  const getSuggestions = () => [
    'How can I improve soil health?',
    'Help me identify a crop problem',
    'Explain drip irrigation basics',
    'What should I know before spraying?'
  ];
  const suggestions = getSuggestions();
  const aiProviderLabel = openAiKey
    ? `OpenAI (${selectedModel})`
    : import.meta.env.VITE_GEMINI_API_KEY
      ? 'Gemini'
      : 'API key needed';
  const aiIsConfigured = Boolean(openAiKey || import.meta.env.VITE_GEMINI_API_KEY);

  return (
    <div className="ai-advisor-card" style={{ position: 'relative' }}>
      {/* Top Header */}
      <div className="ai-advisor-header">
        <div className="ai-advisor-title-group">
          <div className="ai-avatar-badge">🌱</div>
          <div className="ai-title-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>AI कृषी मित्र (ChatGPT)</h3>
              <span style={{
                background: aiIsConfigured ? '#e6f4ea' : '#fef7e0',
                color: aiIsConfigured ? '#137333' : '#b06000',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                border: aiIsConfigured ? '1px solid #ceead6' : '1px solid #feefc3'
              }}>
                {aiProviderLabel}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#5f6368' }}>
              पिकांवरील रोग, खते व औषधांबद्दल अचूक सल्ला
            </p>
          </div>
        </div>

      </div>

      {/* Messages Stream */}
      <div className="ai-messages-container" ref={messagesContainerRef}>
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />

        <button
          type="button"
          className="btn-ai-icon"
          onClick={() => fileInputRef.current?.click()}
          title="पिकाचा फोटो पाठवा"
        >
          📷
        </button>

        <button
          type="button"
          className={`btn-ai-icon ${isRecording ? 'recording' : ''}`}
          onClick={handleToggleVoice}
          title={isRecording ? 'रेकॉर्डिंग थांबवा' : 'बोलून प्रश्न विचारा (मराठी/हिंदी)'}
        >
          {isRecording ? '🛑' : '🎙️'}
        </button>

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
          disabled={isThinking || (!inputText.trim() && !selectedImage)}
          title="पाठवा"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
