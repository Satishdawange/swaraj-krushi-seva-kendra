import { supabase } from "../config/supabase";

// =========================================================
// SUBMIT PRODUCT REQUEST
// =========================================================

export async function createProductRequest({
  productName,

  shortDescription,

  usageDescription,
}) {
  const { data, error } = await supabase

    .from("product_requests")

    .insert({
      product_name: productName || null,

      short_description: shortDescription || null,

      usage_description: usageDescription,
    })

    .select()

    .single();

  if (error) {
    console.error("Product request error:", error);

    throw error;
  }

  return data;
}
