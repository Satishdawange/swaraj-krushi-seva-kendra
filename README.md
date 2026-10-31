# स्वराज कृषी सेवा केंद्र — React Website

सुंदर, responsive Marathi React/Vite वेबसाइट. सध्या उत्पादन डेटा `src/data/products.js` मध्ये static JSON-style array मध्ये आहे. भविष्यात Supabase/Firebase सारख्या cloud database ला जोडण्यासाठी product data layer वेगळा ठेवला आहे.

## सुरू करण्यासाठी

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## सर्वात आधी बदलायच्या गोष्टी

1. `src/components/Layout.jsx` मधील `919999999999` हा WhatsApp/फोन नंबर बदला.
2. `src/pages/Contact.jsx` मधील पत्ता, वेळ आणि Google Maps query बदला.
3. `src/data/products.js` मध्ये खऱ्या दुकानातील उत्पादनांची माहिती, किंमत आणि images बदला.
4. Remote Unsplash image URLs ऐवजी हवे असल्यास `public/images` मध्ये local images ठेवून paths बदला.

## पुढील database-ready upgrade

`products.js` मधील static data बदलून API service तयार करता येईल. Supabase, Firebase किंवा दुसऱ्या free-tier backend कडून products fetch करून search/filter/detail pages तशाच ठेवता येतील.

## Admin sign-in आणि dashboard cache

Admin/Staff खात्यांसाठी Google Apps Script login API वापरला जातो. Apps Script मध्ये `src/utils/googleAppsScriptTemplate.js` मधील पूर्ण script deploy करा आणि **Deploy → Manage deployments → Edit → New version → Deploy** वापरून नवीन आवृत्ती प्रकाशित करा. वेब-अॅप URL बदलल्यास तो Admin → Google Sheets Integration मध्ये अद्ययावत करा. जुन्या deployment वर session endpoints उपलब्ध नसतील आणि login चुकीच्या password चा संदेश दाखवू शकतो.

पहिल्या यशस्वी login वेळी script लपवलेली `Auth_Sessions` शीट तयार करतो. या शीटमध्ये फक्त session-token hash व password-fingerprint असतो; browser मध्ये पासवर्ड साठवला जात नाही. जुना local users/password cache app सुरू होताना काढून टाकला जातो. HMAC fingerprint साठी स्वतंत्र secret Apps Script Script Properties मध्ये तयार होतो. `Users` शीटमधील पासवर्ड बदलल्यास जुने sessions पुढील validation वेळी रद्द होतात (साधारण दोन मिनिटांच्या आत, किंवा tab पुन्हा उघडल्यावर). Logout केल्यास त्या device वरील session revoke होतो.

**महत्त्वाचे:** नवीन script `getAll` आणि `getRecent` public actions मधून `Users` टॅब वाचण्यास नकार देतो. जुन्या deployed script मध्ये हा प्रतिबंध नसल्यास Web App URL असलेला कोणीही `Users` टॅबमधील password cells वाचू शकतो. नवीन आवृत्ती deploy केल्यानंतर सर्व Admin/Staff passwords बदला; जुन्या deployment ला सुरक्षित समजू नका.

Dashboard signed-in खात्याच्या device-local cache मधून लगेच दाखवतो आणि नंतर निवडलेल्या कालावधीसाठी Google Sheets मधून refresh करतो. Bills साठी आज, हा आठवडा, हा महिना, मागील महिना किंवा निवडलेला महिना फिल्टर उपलब्ध आहे. API फक्त त्या महिन्यांचे bill tabs वाचतो आणि browser ला search/status नुसार paginated results पाठवतो. नवीन bills आपोआप `Bills_YYYY_MM` tab मध्ये साठवले जातात; जुन्या deployment मधील `Bills` tab fallback म्हणून वापरला जातो. Dashboard API बदलांसाठी Apps Script template पुन्हा deploy करा; आवृत्ती v10 आवश्यक आहे. कॅशमध्ये dashboard साठी आवश्यक sales आणि customer-dues तपशील असतात. Logout केल्यावर त्या खात्याचा dashboard cache काढला जातो; dashboard मधील **कॅशे काढा** नियंत्रणही उपलब्ध आहे. Customer mobile-only login तात्पुरता आहे आणि तो reload नंतर कायम राहत नाही.

Bill pagination, search, status/date/category filtering आणि dashboard totals server-side केले जातात. Apps Script निवडलेल्या महिन्याच्या tab मधील rows तारीखेनुसार तपासतो; सध्याच्या आठवड्याची मर्यादा लावून फक्त आवश्यक bill page browser मध्ये पाठवतो. Google Sheets मध्ये database सारखा date index उपलब्ध नसल्याने Apps Script ला त्या महिन्याच्या tab rows scan करावे लागतात. त्यामुळे अनेक वर्षांच्या bills साठी dashboard अधिक वेगवान होईल; एखाद्या महिन्यातच खूप मोठा data असल्यास indexed date queries असलेला database/API पुढील सुधारणा ठरेल.

Dashboard मधील cache काढण्याचा पर्याय फक्त analytics data हटवतो. Login cache/token browser storage मधून काढल्यास protected pages पुढील load वर login मागतील.

`initTabs` ने नवीन Users शीट तयार केली असल्यास, deployment सार्वजनिक वापरासाठी देण्याआधी seeded admin/staff पासवर्ड बदलून घ्या.

//update website in VS code
git status
git add .
git commit -m "Update website"
git push
