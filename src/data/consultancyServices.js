/**
 * Swaraj Krushi Seva Kendra - Consultancy Services Seed Data
 * Biligual (Marathi & English) with image URLs and slideshow galleries
 */

export const DEFAULT_SERVICE_IMAGE = 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80';

export const initialConsultancyServices = [
  {
    id: 'serv_grapes',
    nameMr: 'द्राक्ष पीक सल्ला व कन्सल्टन्सी',
    nameEn: 'Grapes Crop Consultancy',
    crop: 'द्राक्ष (Grapes)',
    cropEn: 'Grapes',
    cardImageUrl: 'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=800&q=80',
    slideshowImages: [
      'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1506806732259-39c2d0268443?auto=format&fit=crop&w=1200&q=80'
    ].join(','),
    descriptionMr: 'द्राक्ष बागेसाठी छाटणीपासून ते काढणीपर्यंत संपूर्ण तांत्रिक मार्गदर्शन. खरड छाटणी व गोडी छाटणी नियोजन, योग्य संजीवकांचा (PGR) वापर, डाऊनी व भुरी रोगाचे वेळेवर नियंत्रण आणि दर्जेदार एक्सपोर्ट क्वालिटी मण्यांचा आकार मिळवण्यासाठी विशेष खत व औषध वेळापत्रक.',
    descriptionEn: 'End-to-end technical consultancy for vineyards from pruning to harvesting. Comprehensive schedule for October & April pruning, precision PGR usage, Downy & Powdery Mildew management, and specialized nutrition for export-quality berry size.',
    keyBenefitsMr: '• मण्यांचा एकसमान आकार आणि उत्तम चकाकी\n• डाऊनी मिल्ड्यू, करपा व भुरी रोगाचे आगाऊ नियंत्रण\n• एक्सपोर्ट मानकांनुसार औषधांचे योग्य प्रमाण (MRL सुसंगत)\n• प्रति एकर उत्पादन व उताऱ्यामध्ये हमखास वाढ',
    farmerFeedback: 'स्वराज कृषी सेवा केंद्राच्या द्राक्ष सल्ल्यामुळे माझ्या बागेत डाऊनीचा कसलाही प्रादुर्भाव झाला नाही. मण्यांची साईज १८ मिमी+ मिळाली आणि यंदा विक्रमी एक्सपोर्ट दर मिळाला! - रमेश पाटील, चांदवड',
    isActive: true,
    showOnPortal: true,
    sortOrder: 1,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z'
  },
  {
    id: 'serv_tomato',
    nameMr: 'टोमॅटो पीक सल्ला व कन्सल्टन्सी',
    nameEn: 'Tomato Crop Consultancy',
    crop: 'टोमॅटो (Tomato)',
    cropEn: 'Tomato',
    cardImageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
    slideshowImages: [
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1546470427-0d4db154ceb7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1200&q=80'
    ].join(','),
    descriptionMr: 'टोमॅटो लागवडीपासून भरपूर तोडे मिळेपर्यंत परिपूर्ण मार्गदर्शन. रोपांची पुनर्लागवड, नागअळी व पांढरी माशी नियंत्रण, अर्ली व लेट ब्लाइट (करपा) प्रतिबंध, फुलोरा व फळधारणा वाढवण्यासाठी मायक्रोन्यूट्रियंट डोस आणि आकर्षक लाल रंगासाठी विशेष पोषण व्यवस्थापन.',
    descriptionEn: 'Complete guidance for tomato farming from transplanting to maximum pickings. Preventive measures against Leaf Minor, Whitefly, Early & Late Blight, micro-nutrient scheduling for flower retention, and optimal fruit weight.',
    keyBenefitsMr: '• व्हायरस व पांढरी माशी प्रादुर्भावापासून १००% रक्षण\n• फुलगळ थांबवून जास्त फळधारणा व फुलोरा\n• फळांचा घट्टपणा व आकर्षक लाल रंगामुळे बाजारात चांगला दर\n• तोड्यांची संख्या वाढून दीर्घकाळ उत्पादन',
    farmerFeedback: 'टोमॅटो पिकावर दरवर्षी करपा यायचा. स्वराज कन्सल्टन्सीचे शेड्यूल वापरल्याने झाडे शेवटपर्यंत हिरवीगार राहिली आणि २५ तोडे यशस्वीरीत्या झाले! - विठ्ठल शिंदे, कानमंडाळे',
    isActive: true,
    showOnPortal: true,
    sortOrder: 2,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z'
  },
  {
    id: 'serv_pomegranate',
    nameMr: 'डाळिंब पीक सल्ला व कन्सल्टन्सी',
    nameEn: 'Pomegranate Crop Consultancy',
    crop: 'डाळिंब (Pomegranate)',
    cropEn: 'Pomegranate',
    cardImageUrl: 'https://images.unsplash.com/photo-1541344999736-83eca872f241?auto=format&fit=crop&w=800&q=80',
    slideshowImages: [
      'https://images.unsplash.com/photo-1541344999736-83eca872f241?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=1200&q=80'
    ].join(','),
    descriptionMr: 'डाळिंब बागेसाठी बहार नियोजन (हस्त/आंबे/मृग बहार), तेल्या (बॅक्टेरियल ब्लाइट) व मर रोगाचे शास्त्रीय नियंत्रण, फळ पोसणे, दाण्यांचा गडद लाल रंग आणि फळांना चकाकी आणण्यासाठी एकात्मिक खत व पाणी व्यवस्थापन.',
    descriptionEn: 'Scientific management for pomegranate orchards covering Bahar treatment, Bacterial Blight (Telya) and Wilt disease prevention, fruit sizing, deep aril coloring, and drip irrigation scheduling.',
    keyBenefitsMr: '• तेल्या व पिनहोल बोरर रोगावर प्रभावी नियंत्रण\n• डाळींब फळ तडकणे (Cracking) पूर्णपणे थांबवणे\n• दाण्यांचा गडद लाल रंग व उच्च गोडवा (Brix)\n• उत्कृष्ट आकार व डागविरहित चमकदार फळे',
    farmerFeedback: 'माझ्या डाळिंब बागेत तेल्याचा मोठा धोका होता. निलेश दादांच्या योग्य औषध सल्ल्याने तेल्या पूर्ण आटोक्यात आला आणि यंदा प्रथमच नंबर १ ग्रेड माल निघाला. - समाधान बोरसे, देवळा',
    isActive: true,
    showOnPortal: true,
    sortOrder: 3,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z'
  },
  {
    id: 'serv_watermelon',
    nameMr: 'कलिंगड पीक सल्ला व कन्सल्टन्सी',
    nameEn: 'Watermelon Crop Consultancy',
    crop: 'कलिंगड (Watermelon)',
    cropEn: 'Watermelon',
    cardImageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
    slideshowImages: [
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1589533610925-1cffc309ebaa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1563114773-84221bd62daa?auto=format&fit=crop&w=1200&q=80'
    ].join(','),
    descriptionMr: 'कमी कालावधीत कलिंगडाचे बंपर उत्पादन घेण्यासाठी बेड तयार करणे, मल्चिंग पेपर वापर, ठिबकद्वारे विद्राव्य खतांचे अचूक नियोजन, फळमाशी व नागअळी प्रतिबंध आणि ५ ते ८ किलो वजनाची गोड फळे मिळवण्यासाठी विशेष तंत्रज्ञान.',
    descriptionEn: 'Short-duration high-yield watermelon technology including raised-bed mulching, soluble fertigation schedules, fruit fly management, and achieving 5-8 kg uniform sweet melons.',
    keyBenefitsMr: '• ६५ ते ७० दिवसांत वजनदार फळांची एकाच वेळी काढणी\n• गर लालभडक व जास्त गोडवा (Sugar content)\n• फळांची साठवणूक क्षमता जास्त असल्याने दूरच्या बाजारात विक्री सोपी\n• कमी खर्चात जास्तीत जास्त निव्वळ नफा',
    farmerFeedback: '६५ दिवसांत कलिंगडाचे एकरी २५ टन उत्पादन मिळाले! एकाही फळाला डाग नव्हता, व्यापारी थेट शेतात येऊन गाडी भरून घेऊन गेले. - ज्ञानेश्वर ठाकरे, चांदवड',
    isActive: true,
    showOnPortal: true,
    sortOrder: 4,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z'
  }
];

