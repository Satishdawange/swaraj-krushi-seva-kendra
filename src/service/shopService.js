import { supabase } from "../config/supabase";

// =========================================================
// GET SHOP INFORMATION
// =========================================================
//
// This function gets the shop information from the
// shop_settings table in Supabase.
//
// We expect only ONE shop record.
//
// =========================================================

export async function getShopSettings() {
  const { data, error } = await supabase

    .from("shop_settings")

    .select("*")

    .limit(1)

    .single();

  // =======================================================
  // HANDLE DATABASE ERROR
  // =======================================================

  if (error) {
    console.error("Error fetching shop settings:", error);

    throw error;
  }

  // =======================================================
  // RETURN SHOP INFORMATION
  // =======================================================

  return data;
}
