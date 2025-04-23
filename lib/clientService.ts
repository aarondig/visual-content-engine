import { supabase } from "../lib/supabaseClient";

export async function getClients(userId: string): Promise<{ data: Client[] | null; error: any }> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data: data as Client[] | null, error };
}

import { Client } from "../types";

export async function addClient(
  userId: string,
  name: string,
  company_name: string,
  job_title: string,
  linkedin: string,
  website: string,
  image: string,
  brand_guide: Record<string, any>
): Promise<{ data: Client[] | null; error: any }> {
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
  return { data: data as Client[] | null, error };
}

export async function deleteClient(clientId: string) {
  const { data, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);
  return { data, error };
}
