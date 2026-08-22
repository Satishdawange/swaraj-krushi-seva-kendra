import React, {
  useEffect,
  useState
} from 'react';

import {
  MessageCircle,
  Search,
  CheckCircle2
} from '../components/Icons';

import {
  getProducts
} from '../service/productService';

import ShopProp from '../config/shopProps';

import {
  createProductRequest
} from '../service/productRequestService';

import {
  findSimilarProducts
} from '../service/productSearchService';

import ProductCard from '../components/ProductCard';

import '../CSS/productRequest.css';


export default function ProductRequest() {


  // =====================================================
  // FORM STATE
  // =====================================================

  const [
    productName,
    setProductName
  ] = useState('');


  const [
    shortDescription,
    setShortDescription
  ] = useState('');


  const [
    usageDescription,
    setUsageDescription
  ] = useState('');


  // =====================================================
  // PRODUCTS
  // =====================================================

  const [
    products,
    setProducts
  ] = useState([]);


  // =====================================================
  // SIMILAR PRODUCTS
  // =====================================================

  const [
    similarProducts,
    setSimilarProducts
  ] = useState([]);


  // =====================================================
  // UI STATES
  // =====================================================

  const [
    checking,
    setChecking
  ] = useState(false);


  const [
    submitting,
    setSubmitting
  ] = useState(false);


  const [
    submitted,
    setSubmitted
  ] = useState(false);


  const [
    error,
    setError
  ] = useState('');


  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  useEffect(() => {

    async function loadProducts() {

      try {

        const data =
          await getProducts();

        setProducts(data);

      } catch (error) {

        console.error(error);

      }

    }


    loadProducts();

  }, []);


  // =====================================================
  // CHECK SIMILAR PRODUCTS
  // =====================================================

  const checkSimilarProducts =
    () => {

      setChecking(true);

      setError('');


      const results =
        findSimilarProducts(

          products,

          productName,

          shortDescription,

          usageDescription

        );


      setSimilarProducts(results);


      setChecking(false);

    };


  // =====================================================
  // SUBMIT REQUEST
  // =====================================================

  const handleSubmit =
    async (event) => {

      event.preventDefault();


      // -----------------------------------------------
      // Validation
      // -----------------------------------------------

      if (
        !usageDescription.trim()
      ) {

        setError(
          'कृपया उत्पादन कशासाठी हवे आहे ते लिहा.'
        );

        return;

      }


      try {

        setSubmitting(true);

        setError('');


        // ---------------------------------------------
        // Save request in Supabase
        // ---------------------------------------------

        const request =
          await createProductRequest({

            productName,

            shortDescription,

            usageDescription

          });


        // ---------------------------------------------
        // Create WhatsApp message
        // ---------------------------------------------

        const message = `

नमस्कार स्वराज कृषी सेवा केंद्र,

मला खालील उत्पादन उपलब्ध करून घ्यायचे आहे.

उत्पादनाचे नाव:
${productName || 'माहित नाही'}

थोडक्यात माहिती:
${shortDescription || 'दिलेली नाही'}

कशासाठी हवे आहे:
${usageDescription}

Request ID:
${request.id}

कृपया हे उत्पादन उपलब्ध आहे का किंवा त्याऐवजी योग्य पर्याय आहे का ते कळवा.

धन्यवाद.

        `.trim();


        const whatsappUrl =
  `https://wa.me/${ShopProp.whatsapp}?text=${
    encodeURIComponent(message)
  }`;


        // ---------------------------------------------
        // Show success
        // ---------------------------------------------

        setSubmitted(true);


        // ---------------------------------------------
        // Open WhatsApp
        // ---------------------------------------------

        window.open(
          whatsappUrl,
          '_blank'
        );


      } catch (err) {

        console.error(err);

        setError(
          'तुमची विनंती पाठवता आली नाही. कृपया पुन्हा प्रयत्न करा.'
        );

      } finally {

        setSubmitting(false);

      }

    };


  // =====================================================
  // SUCCESS SCREEN
  // =====================================================

  if (submitted) {

    return (

      <section className="simple-page">

        <div className="request-success">

          <CheckCircle2 size={55} />

          <h1>
            तुमची विनंती पाठवली आहे!
          </h1>

          <p>

            तुमची मागणी आमच्याकडे नोंदवली आहे
            आणि WhatsApp वरही पाठवली आहे.

          </p>

          <p>

            आम्ही उपलब्धता तपासून
            तुम्हाला योग्य माहिती देऊ.

          </p>

        </div>

      </section>

    );

  }


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <section className="simple-page product-request-page">


      {/* =================================================
          HERO
      ================================================= */}

      <div className="page-hero">

        <span className="pill">
          🌱 शेतकऱ्यांसाठी विशेष सुविधा
        </span>

        <h1>
          तुम्हाला हवे असलेले उत्पादन
          शोधण्यात आम्हाला सांगा
        </h1>

        <p>

          दुकानात उपलब्ध नसलेले उत्पादन
          आम्हाला सांगा. आम्ही उपलब्धता तपासण्याचा
          प्रयत्न करू.

        </p>

      </div>



      {/* =================================================
          FORM
      ================================================= */}

      <form
        className="product-request-form"
        onSubmit={handleSubmit}
      >


        {/* Product Name */}

        <div className="form-group">

          <label>
            उत्पादनाचे नाव
            <span> माहिती असेल तर </span>
          </label>

          <input
            type="text"
            value={productName}
            onChange={(e) =>
              setProductName(e.target.value)
            }
            placeholder="उदा. मॅन्कोझेब 75% WP"
          />

        </div>



        {/* Short Description */}

        <div className="form-group">

          <label>
            उत्पादनाबद्दल थोडक्यात माहिती
          </label>

          <textarea
            value={shortDescription}
            onChange={(e) =>
              setShortDescription(
                e.target.value
              )
            }
            placeholder="तुम्हाला कोणत्या प्रकारचे उत्पादन हवे आहे?"
            rows="3"
          />

        </div>



        {/* Usage */}

        <div className="form-group">

          <label>
            तुम्हाला हे उत्पादन कशासाठी हवे आहे?
            <span>*</span>
          </label>

          <textarea
            value={usageDescription}
            onChange={(e) =>
              setUsageDescription(
                e.target.value
              )
            }
            placeholder="उदा. टोमॅटो पिकावर बुरशीजन्य रोगासाठी..."
            rows="4"
            required
          />

        </div>



        {/* =================================================
            SIMILAR PRODUCT SEARCH
        ================================================= */}

        <button
          type="button"
          className="secondary-btn"
          onClick={checkSimilarProducts}
          disabled={checking}
        >

          <Search size={18} />

          {checking
            ? 'उत्पादने तपासत आहोत...'
            : 'समान उत्पादने तपासा'
          }

        </button>



        {/* =================================================
            SIMILAR PRODUCTS
        ================================================= */}

        {similarProducts.length > 0 && (

          <div className="similar-products">

            <h3>

              तुमच्या गरजेशी संबंधित उत्पादने

            </h3>

            <p>

              कदाचित यापैकी एखादे उत्पादन
              तुमच्या गरजेसाठी योग्य असू शकते.

            </p>


            <div className="product-grid">

              {similarProducts.map(
                product => (

                  <ProductCard
                    key={product.id}
                    product={product}
                  />

                )
              )}

            </div>

          </div>

        )}


        {/* =================================================
            NO SIMILAR PRODUCTS
        ================================================= */}

        {similarProducts.length === 0 &&
          (productName ||
            shortDescription ||
            usageDescription) && (

            <p className="no-similar-products">

              समान उत्पादन सापडले नाही.
              तुमची विनंती आम्हाला पाठवू शकता.

            </p>

          )}



        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="request-error">

            {error}

          </div>

        )}



        {/* =================================================
            SUBMIT
        ================================================= */}

        <button
          type="submit"
          className="primary-btn request-submit"
          disabled={submitting}
        >

          <MessageCircle size={19} />

          {submitting
            ? 'विनंती पाठवत आहे...'
            : 'विनंती WhatsApp वर पाठवा'
          }

        </button>


      </form>

    </section>

  );

}