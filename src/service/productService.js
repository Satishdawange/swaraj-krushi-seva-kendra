import { supabase } from "../config/supabase";

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error("Error fetching products:", error);

    throw error;
  }

  return data || [];
}

export async function getProductById(id) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("Error fetching product:", error);

    return null;
  }

  return data;
}

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    console.error("Error fetching categories:", error);

    throw error;
  }

  return data || [];
}
