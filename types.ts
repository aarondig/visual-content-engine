// Shared types for Visual Content Engine

export interface Client {
  id: string;
  user_id: string;
  name: string;
  company_name: string;
  job_title: string;
  linkedin: string;
  website: string;
  image: string; // URL or storage ref
  brand_guide: Record<string, any>; // or a more specific type if you like
  created_at: string;
}
