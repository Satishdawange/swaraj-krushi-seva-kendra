import { supabase } from "./supabase";

// =========================================================
// DEFAULT / FALLBACK SHOP INFORMATION
// =========================================================
//
// This information is available immediately when the
// website starts.
//
// If Supabase is unavailable, the website will continue
// using this information.
//
// =========================================================

const ShopProp = {
  name: "Swaraj Krushi Seva Kendra",

  fullName: "स्वराज कृषी सेवा केंद्र",

  ownerName: "निलेश त्र्यंबक दवंगे",

  phone: "+918459568940",

  whatsapp: "918459568940",

  address: "कानमंडाळे, तालुका चांदवड (नाशिक), महाराष्ट्र",

  pincode: "423117",
};

// =========================================================
// LOAD SHOP INFORMATION FROM SUPABASE
// =========================================================
//
// This function runs automatically when this file is
// imported for the first time.
//
// =========================================================

async function loadShopFromDatabase() {
  try {
    const { data, error } = await supabase

      .from("shop_settings")

      .select("*")

      .limit(1)

      .single();

    // =======================================================
    // DATABASE ERROR
    // =======================================================

    if (error) {
      console.error("Error loading shop information:", error);

      return;
    }

    // =======================================================
    // UPDATE EXISTING OBJECT
    // =======================================================
    //
    // We are NOT creating another object.
    //
    // We are updating the same ShopProp object that the
    // rest of your application already imports.
    //
    // =======================================================

    ShopProp.name = data.name;

    ShopProp.fullName = data.full_name;

    ShopProp.ownerName = data.owner_name;

    ShopProp.phone = data.phone;

    ShopProp.whatsapp = data.whatsapp;

    ShopProp.address = data.address;

    ShopProp.pincode = data.pincode;

    // =======================================================
    // DEBUG
    // =======================================================

    //console.log("Shop information loaded from Supabase:", ShopProp);
  } catch (error) {
    console.error("Shop information error:", error);
  }
}

// =========================================================
// START DATABASE REQUEST
// =========================================================

loadShopFromDatabase();

// =========================================================
// EXPORT SAME OBJECT
// =========================================================
//
// All your existing files can continue:
//
// import ShopProp from '../config/shopProps';
//
// =========================================================

export default ShopProp;
