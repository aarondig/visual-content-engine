import { supabase } from "../lib/supabaseClient";
import { BrandGuide, Client } from "../types";

export async function getClients(userId: string): Promise<{ data: Client[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data: data as Client[] | null, error: error ? String(error) : null };
}


export async function addClient(
  userId: string,
  name: string,
  company_name: string,
  job_title: string,
  linkedin: string,
  website: string,
  image: string,
  brand_guide: BrandGuide
): Promise<{ data: Client[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("clients")
    .insert([
      {
        user_id: userId,
        name,
        company_name,
        job_title,
        linkedin,
        website,
        image,
        brand_guide
      },
    ])
    .select();
  return { data: data as Client[] | null, error: error ? String(error) : null };
}

export async function deleteClient(clientId: string) {
  const { data, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);
  return { data, error: error ? String(error) : null };
}
