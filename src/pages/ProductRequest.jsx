import React, {
  useEffect,
  useState
} from 'react';

import {
  MessageCircle,
  CheckCircle2
} from '../components/Icons';

import ShopProp from '../config/shopProps';

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
  // SUBMISSION STATE
  // =====================================================

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
  // SUBMIT REQUEST
  // =====================================================

  const handleSubmit = (event) => {

    event.preventDefault();


    // ---------------------------------------------------
    // Clear previous error
    // ---------------------------------------------------

    setError('');


    // ---------------------------------------------------
    // Validate required field
    // ---------------------------------------------------

    if (!usageDescription.trim()) {

      setError(
        'कृपया उत्पादन कशासाठी हवे आहे ते लिहा.'
      );

      return;

    }


    try {

      setSubmitting(true);


      // =================================================
      // CREATE WHATSAPP MESSAGE
      // =================================================

      const message = `

नमस्कार ${ShopProp.fullName},

मला खालील उत्पादन उपलब्ध करून घ्यायचे आहे.

उत्पादनाचे नाव:
${productName.trim() || 'माहित नाही'}

थोडक्यात माहिती:
${shortDescription.trim() || 'दिलेली नाही'}

कशासाठी हवे आहे:
${usageDescription.trim()}

कृपया हे उत्पादन उपलब्ध आहे का किंवा
यासाठी योग्य पर्याय उपलब्ध आहे का ते कळवा.

धन्यवाद.

      `.trim();


      // =================================================
      // CREATE WHATSAPP URL
      // =================================================

      const whatsappUrl =
        `https://wa.me/${ShopProp.whatsapp}?text=${
          encodeURIComponent(message)
        }`;


      // =================================================
      // OPEN WHATSAPP
      // =================================================

      window.open(
        whatsappUrl,
        '_blank'
      );


      // =================================================
      // SUCCESS
      // =================================================

      setSubmitted(true);


    } catch (err) {

      console.error(
        'WhatsApp error:',
        err
      );

      setError(
        'WhatsApp उघडताना समस्या आली. कृपया पुन्हा प्रयत्न करा.'
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
            तुमची विनंती तयार आहे!
          </h1>

          <p>

            तुमची उत्पादन मागणी WhatsApp वर
            पाठवण्यासाठी तयार करण्यात आली आहे.

          </p>

          <p>

            WhatsApp मध्ये संदेश पाठवण्याचे
            बटण दाबा.

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
          PAGE HERO
      ================================================= */}

      <div className="page-hero">

        <span className="pill">
          🌱 शेतकऱ्यांसाठी विशेष सुविधा
        </span>

        <h1>
          तुम्हाला हवे असलेले उत्पादन
          आम्हाला सांगा
        </h1>

        <p>

          दुकानात उपलब्ध नसलेले किंवा
          तुम्हाला आवश्यक असलेले उत्पादन
          आम्हाला कळवा.

        </p>

      </div>


      {/* =================================================
          REQUEST FORM
      ================================================= */}

      <form
        className="product-request-form"
        onSubmit={handleSubmit}
      >


        {/* =================================================
            PRODUCT NAME
        ================================================= */}

        <div className="form-group">

          <label>

            उत्पादनाचे नाव

            <span>
              ऐच्छिक
            </span>

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


        {/* =================================================
            SHORT DESCRIPTION
        ================================================= */}

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


        {/* =================================================
            USAGE
        ================================================= */}

        <div className="form-group">

          <label>

            तुम्हाला हे उत्पादन कशासाठी हवे आहे?

            <span>
              *
            </span>

          </label>


          <textarea
            value={usageDescription}
            onChange={(e) =>
              setUsageDescription(
                e.target.value
              )
            }
            placeholder="उदा. टोमॅटो पिकासाठी बुरशीजन्य रोगाच्या व्यवस्थापनासाठी..."
            rows="5"
            required
          />

        </div>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="request-error">

            {error}

          </div>

        )}


        {/* =================================================
            WHATSAPP BUTTON
        ================================================= */}

        <button
          type="submit"
          className="primary-btn request-submit"
          disabled={submitting}
        >

          <MessageCircle size={19} />

          {submitting
            ? 'WhatsApp उघडत आहे...'
            : 'WhatsApp वर विनंती पाठवा'
          }

        </button>


        {/* =================================================
            INFORMATION
        ================================================= */}

        <p className="request-note">

          तुमची माहिती थेट
          <strong>
            {ShopProp.fullName}
          </strong>
          च्या WhatsApp वर पाठवली जाईल.

        </p>


      </form>

    </section>

  );

}