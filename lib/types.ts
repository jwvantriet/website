export type Industry = 'Aviation' | 'Maritime' | 'Offshore';

export interface Vacancy {
  id: number;
  slug: string;
  carerix_id: string | null;
  title: string;
  industry: Industry;
  location: string | null;
  employment_type: string | null;
  summary: string | null;
  description: string | null;
  apply_url: string | null;
  is_active: boolean;
  posted_date: string;
  modification_date: string | null;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  author: string | null;
  cover_image_url: string | null;
  read_time: string | null;
  published: boolean;
  published_at: string | null;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ContactSubmissionInput {
  name: string;
  email: string;
  company?: string;
  industry?: string;
  inquiry_type: 'client' | 'candidate';
  field_of_expertise?: string;
  message: string;
}
