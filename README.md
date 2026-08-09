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

//update website in VS code
git status
git add .
git commit -m "Update website"
git push
