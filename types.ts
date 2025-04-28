// Shared types for Visual Content Engine

export interface BrandGuide {
  colors: string[];
  logo: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  company_name: string;
  job_title: string;
  linkedin: string;
  website: string;
  image: string; // URL or storage ref
  brand_guide: BrandGuide;
  created_at: string;
}
