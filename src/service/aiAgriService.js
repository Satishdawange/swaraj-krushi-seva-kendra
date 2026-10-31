import { getCustomerBills, cleanMobileNumber } from "./billingService.js";
import { getLiveInventoryItems } from "./googleSheetsService.js";

// Local Storage key for storing custom OpenAI API Key
export const OPENAI_KEY_STORAGE = 'sksk_openai_api_key';
export const AI_MODEL_STORAGE = 'sksk_ai_selected_model';

export function getOpenAIKey() {
  return localStorage.getItem(OPENAI_KEY_STORAGE) || import.meta.env.VITE_OPENAI_API_KEY || '';
}

export function saveOpenAIKey(key) {
  if (key) {
    localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(OPENAI_KEY_STORAGE);
  }
}

export function getSelectedAiModel() {
  return localStorage.getItem(AI_MODEL_STORAGE) || 'gpt-4o-mini';
}

export function saveSelectedAiModel(model) {
  localStorage.setItem(AI_MODEL_STORAGE, model);
}

// Check if query is asking for bill details by 10-digit mobile number
async function handleMobileLookup(mobile) {
  try {
    const clean = cleanMobileNumber(mobile);
    const customer = await getCustomerBills(clean);
    if (customer && customer.bills && customer.bills.length > 0) {
      const latest = customer.bills[0];
      const itemsList = (latest.items || []).map(i => `• ${i.name} (${i.qty} ${i.unit || 'नग'})`).join('\n');
      return `🌾 नमस्कार ${customer.customer_name || 'शेतकरी मित्र'}! 🙏
आपल्या मोबाईल क्रमांक ${clean} वरील सर्वात शेवटच्या बिलाची माहिती खालीलप्रमाणे:

📄 बिल क्रमांक: ${latest.billNo || 'उपलब्ध नाही'}
📅 तारीख: ${latest.billDate || ''}
💰 एकूण रक्कम: ₹${latest.totalAmount || 0}
💳 पेमेंट स्थिती: ${latest.paymentStatus || latest.paymentMode || 'Paid'}

📦 खरेदी केलेली औषधे:
${itemsList || 'माहिती उपलब्ध नाही'}

💡 या औषधांचे पाण्याचे प्रमाण व फवारणी कशी करावी याबाबत काहीही शंका असल्यास विचारा किंवा थेट प्रोप्रायटर निलेश दवंगे (8459568940) यांच्याशी संपर्क साधा!`;
    }
  } catch (e) {
    console.warn('Customer lookup error:', e);
  }
  return null;
}

// -----------------------------------------------------------------------------
// Call ChatGPT (OpenAI API)
// -----------------------------------------------------------------------------
async function callChatGPT(messages, apiKey, model = 'gpt-4o-mini') {
  const url = 'https://api.openai.com/v1/chat/completions';

  // Inject current inventory snapshot for real-time stock awareness
  const inventorySnapshot = (await getLiveInventoryItems())
    .filter((item) => item.isActive)
    .slice(0, 15)
    .map(i => `${i.name}${i.nameEn ? ` / ${i.nameEn}` : ''}${i.availableStock !== undefined ? ` (उपलब्ध: ${i.availableStock} ${i.unit})` : ''}`)
    .join(', ');

  const systemContent = `You are a helpful agricultural assistant for farmers in Maharashtra, India. Reply in the same language as the user (Marathi, Hindi, or English). Answer directly without forcing a fixed crop and symptom intake flow. Ask a brief follow-up only when essential details are missing. Explain practical next steps and state uncertainty. For pesticide or fertilizer advice, never invent a dose; prioritize label directions, safe handling, and local expert confirmation. Answer non-agricultural questions helpfully when possible.

Current shop inventory (use only when asked about product availability; do not provide pricing): ${inventorySnapshot || 'No inventory data available.'}`;

  const chatMessages = [
    { role: 'system', content: systemContent },
    ...messages.map(m => ({
      role: m.sender === 'bot' ? 'assistant' : 'user',
      content: m.image
        ? [
            { type: 'text', text: m.text || 'Please inspect this crop photo and describe visible signs, likely causes, and safe next steps. State uncertainty.' },
            { type: 'image_url', image_url: { url: m.image } }
          ]
        : m.text
    }))
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: chatMessages,
      temperature: 0.5,
      max_tokens: 600
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API Error: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'माफ करा, उत्तर मिळू शकले नाही.';
}

// -----------------------------------------------------------------------------
// Fallback: Gemini API  (with model fallback + retry on overload)
// -----------------------------------------------------------------------------
// Models for this API key — lite-latest confirmed fastest
const GEMINI_MODELS = [
  'gemini-flash-lite-latest',  // fastest and confirmed working
  'gemini-flash-latest',       // standard flash
  'gemini-3.8-flash',          // newest flash
  'gemini-3.7-flash',          // fallback
  'gemini-3.5-flash',          // fallback
];

async function callGemini(promptText, geminiKey, history = [], image = null) {
  const systemText = 'You are a helpful agricultural assistant for farmers in Maharashtra, India. Reply in the user language (Marathi, Hindi, or English) and answer directly without forcing a fixed intake flow. Ask only necessary follow-up questions. Never invent pesticide or fertilizer doses; prioritize label directions and safe handling. State uncertainty clearly. Answer any question the farmer asks.';
  const contents = (Array.isArray(history) ? history.slice(-6) : []).map(message => ({
    role: message.sender === 'bot' ? 'model' : 'user',
    parts: [{ text: message.text || '' }]
  }));

  const currentParts = [{ text: promptText || 'Please inspect this crop photo and describe visible signs, likely causes, and safe next steps. State uncertainty.' }];
  if (image?.dataUrl) {
    const [metadata, data] = image.dataUrl.split(',');
    const mimeType = metadata.match(/data:([^;]+)/)?.[1] || image.mimeType || 'image/jpeg';
    if (data) currentParts.push({ inline_data: { mime_type: mimeType, data } });
  }
  contents.push({ role: 'user', parts: currentParts });

  let lastError;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout per model
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemText }] },
            contents,
            generationConfig: { temperature: 0.4, maxOutputTokens: 1200 }
          })
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        const msg = error.error?.message || `Gemini API error (${res.status})`;
        if (res.status === 503 || res.status === 429 ||
            msg.toLowerCase().includes('demand') ||
            msg.toLowerCase().includes('overload') ||
            msg.toLowerCase().includes('quota') ||
            msg.toLowerCase().includes('unavailable')) {
          console.warn(`Model ${model} unavailable (${res.status}): ${msg} — trying next...`);
          lastError = new Error(msg);
          continue;
        }
        throw new Error(msg);
      }

      const data = await res.json();
      const answer = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
      if (!answer) { lastError = new Error('Empty response'); continue; }
      console.log(`Gemini responded via model: ${model}`);
      return answer;
    } catch (e) {
      lastError = e;
      const msg = (e.message || '').toLowerCase();
      const isRetryable = msg.includes('demand') || msg.includes('overload') || msg.includes('quota') ||
          msg.includes('fetch') || msg.includes('network') || msg.includes('unavailable') ||
          e.name === 'AbortError' || msg.includes('abort') || msg.includes('timeout');
      if (isRetryable) {
        console.warn(`Model ${model} failed (${e.name || 'Error'}): ${e.message} — trying next...`);
        continue;
      }
      throw e;
    }
  }
  throw lastError || new Error('All Gemini models are currently unavailable. Please try again later.');
}
// -----------------------------------------------------------------------------
// Master Agri Advisor Function
// -----------------------------------------------------------------------------
export async function askAgriAdvisor(promptText, history = [], options = {}) {
  // 1. Check if user typed a mobile number for instant bill lookup
  const mobileMatch = promptText.match(/\b([6-9]\d{9})\b/);
  if (mobileMatch) {
    const billResponse = await handleMobileLookup(mobileMatch[1]);
    if (billResponse) return billResponse;
  }

  // 2. Check OpenAI ChatGPT
  const openAiKey    = getOpenAIKey();
  const selectedModel = options.model || getSelectedAiModel();

  if (openAiKey && openAiKey.trim().length > 10) {
    try {
      const messages = [...history, { sender: 'user', text: promptText, image: options.image?.dataUrl }];
      return await callChatGPT(messages, openAiKey, selectedModel);
    } catch (err) {
      console.error('OpenAI ChatGPT call failed:', err);
      throw err;
    }
  }

  // 3. Check Gemini API
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim().length > 10) {
    try {
      return await callGemini(promptText, geminiKey, history, options.image);
    } catch (err) {
      console.error('Gemini call failed:', err);
      return `🌱 माफ करा, AI सेवा तात्पुरती व्यस्त आहे.\n\nकृपया थोड्या वेळाने पुन्हा प्रयत्न करा.\n\n📞 तात्काळ मदतीसाठी निलेश दवंगे (+91 8459568940) यांच्याशी संपर्क साधा.\n\n💡 आपला प्रश्न परत टाईप केल्यास मी पुन्हा प्रयत्न करेन!`;
    }
  }

  // 4. No AI configured
  return `🌱 AI सेवा सध्या उपलब्ध नाही.\n\nSettings मध्ये जाऊन API Key टाका किंवा निलेश दवंगे (+91 8459568940) यांच्याशी संपर्क साधा.`;
}
