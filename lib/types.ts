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

  // Rich content sections (populated by the Carerix → Supabase sync).
  intro_html: string | null;
  vacancy_html: string | null;
  requirements_html: string | null;
  offer_html: string | null;
  company_html: string | null;
  contact_html: string | null;

  reference_number: string | null;
  publication_start: string | null;
  publication_end: string | null;
  company_name: string | null;

  consultant_name: string | null;
  consultant_title: string | null;
  consultant_phone: string | null;
  consultant_email: string | null;
  consultant_photo: string | null;
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
