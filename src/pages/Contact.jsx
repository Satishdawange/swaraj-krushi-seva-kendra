
import React from 'react';
//import ShopProp from '../config/shopProps';

import {
  MapPin,
  Phone,
  Clock,
  MessageCircle,
  Navigation,
  User,
  ShieldCheck
} from '../components/Icons';

import ShopProp from '../config/shopProps';
import { getShopInfo } from '../service/shopService';


export default function Contact() {
  const shop = getShopInfo();

  const whatsappMessage =
    'नमस्कार, मला उत्पादनाबद्दल चौकशी करायची आहे.';

  const whatsappLink =
    `https://wa.me/${shop.whatsapp || ShopProp.whatsapp}?text=${encodeURIComponent(
      whatsappMessage
    )}`;


  const mapLink ="https://maps.app.goo.gl/7pzXuuJcupboMYcy7";


  return (
    <section className="simple-page contact-page">


      {/* Page Hero */}
      <div className="page-hero">

        <span className="pill">
          📍 संपर्क
        </span>

        <h1>
          आपण बोलूया.
        </h1>

        <p>
          उत्पादनाबद्दल चौकशी, उपलब्धता किंवा दुकानाला भेट —
          आम्हाला WhatsApp किंवा फोन करा.
        </p>

      </div>


      {/* Contact Content */}
      <div className="contact-grid">


        {/* Contact Information */}
        <div className="contact-info">


          {/* Address */}
          <div className="contact-item">

            <MapPin />

            <div>

              <b>
                पत्ता
              </b>

              <span>
                {shop.fullName || ShopProp.fullName}
                <br />

                {shop.address || ShopProp.address}
                <br />

                {shop.pincode || ShopProp.pincode}
              </span>

            </div>

          </div>
          <div className="contact-item">
       <User />

        <div>
         <b>संपर्क व्यक्ती (प्रोप्रायटर)</b>

         <span>
          {shop.ownerName || ShopProp.ownerName}
         </span>
       </div>
       </div>


          {/* Phone */}
          <div className="contact-item">

            <Phone />

            <div>

              <b>
                फोन
              </b>

              <a href={`tel:${shop.phone || ShopProp.phone}`}>
                {shop.phone || ShopProp.phone}
              </a>

            </div>

          </div>

          {/* GSTIN (if configured in properties) */}
          {shop.gstNumber && (
            <div className="contact-item">
              <ShieldCheck />
              <div>
                <b>GSTIN नोंदणी क्रमांक</b>
                <span style={{ fontWeight: '700', color: '#176b3a' }}>
                  {shop.gstNumber}
                </span>
              </div>
            </div>
          )}


          {/* Opening Hours */}
          <div className="contact-item">

            <Clock />

            <div>

              <b>
                दुकानाची वेळ
              </b>

              <span>
                सोमवार ते शनिवार
                <br />
                सकाळी 8:00 ते संध्याकाळी 10:00
              </span>

            </div>

          </div>


          {/* Contact Buttons */}
          <div className="contact-actions">


            {/* WhatsApp */}
            <a
              className="primary-btn"
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle />

              WhatsApp वर संपर्क
            </a>


            {/* Google Maps */}
            <a
              className="secondary-btn"
              href={mapLink}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation />

              नकाशावर पहा
            </a>

          </div>

        </div>


        {/* Map Card */}
        <div className="map-card">

          <div className="map-pattern">

            <div className="map-pin">
              <MapPin />
            </div>

            <span>
              {shop.fullName || ShopProp.fullName}
            </span>

            <small>
              {shop.address || ShopProp.address}
            </small>

            <small>
              {shop.pincode || ShopProp.pincode}
            </small>

          </div>

        </div>


      </div>

    </section>
  );
}
