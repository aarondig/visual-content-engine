import { supabase } from "./supabaseClient";

export async function getPosts(clientId: string) {
  return await supabase
    .from("posts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
}

export async function addPost(clientId: string, userId: string, content: string, imageUrl?: string) {
  return await supabase
    .from("posts")
    .insert([
      {
        client_id: clientId,
        user_id: userId,
        content,
        image_url: imageUrl || null,
      },
    ])
    .select();
}

export async function deletePost(postId: string) {
  return await supabase
    .from("posts")
    .delete()
    .eq("id", postId);
}
