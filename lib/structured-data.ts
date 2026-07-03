/**
 * Schema.org JSON-LD builders.
 *
 * Three schemas matter for a recruitment agency's organic visibility:
 *
 * - EmploymentAgency (site-wide)   → knowledge panel / brand entity
 * - JobPosting (vacancy pages)     → Google for Jobs listings — the single
 *                                    biggest free distribution channel for
 *                                    vacancies
 * - Article (blog posts)           → rich results once /blog-posts is
 *                                    unblocked in robots.txt
 *
 * Render with <script type="application/ld+json"> via the JsonLd component.
 */

import type { Vacancy, BlogPost } from '@/lib/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://confair.com';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EmploymentAgency',
    name: 'Confair Group',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      'Certified contracting and workforce solutions for safety-critical industries: aviation, maritime, and offshore energy.',
    address: [
      {
        '@type': 'PostalAddress',
        streetAddress: 'Tennesseedreef 7e',
        postalCode: '3565 CK',
        addressLocality: 'Utrecht',
        addressCountry: 'NL',
      },
      {
        '@type': 'PostalAddress',
        streetAddress: 'The Prime Tower, Office 2001-25, Business Bay',
        addressLocality: 'Dubai',
        addressCountry: 'AE',
      },
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+31-850-711-950',
        contactType: 'sales',
        email: 'netherlands@confair.com',
        areaServed: 'EU',
      },
      {
        '@type': 'ContactPoint',
        telephone: '+971-55-692-4772',
        contactType: 'sales',
        email: 'uae@confair.com',
        areaServed: 'AE',
      },
    ],
  };
}

// Google's accepted employmentType enum values.
const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  'full-time': 'FULL_TIME',
  fulltime: 'FULL_TIME',
  'part-time': 'PART_TIME',
  parttime: 'PART_TIME',
  contract: 'CONTRACTOR',
  contractor: 'CONTRACTOR',
  temporary: 'TEMPORARY',
  interim: 'TEMPORARY',
  freelance: 'CONTRACTOR',
};

function stripHtml(html: string | null): string {
  return (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function jobPostingSchema(vacancy: Vacancy) {
  const description =
    [vacancy.intro_html, vacancy.vacancy_html, vacancy.requirements_html, vacancy.offer_html]
      .filter(Boolean)
      .join('\n') ||
    vacancy.description ||
    vacancy.summary ||
    vacancy.title;

  const employmentType =
    EMPLOYMENT_TYPE_MAP[String(vacancy.employment_type ?? '').toLowerCase()] ?? 'FULL_TIME';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: vacancy.title,
    description,
    datePosted: vacancy.publication_start ?? vacancy.posted_date,
    employmentType,
    industry: vacancy.industry,
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Confair Group',
      sameAs: SITE_URL,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: vacancy.location || 'International',
      },
    },
    directApply: true,
    url: `${SITE_URL}/vacancies/${vacancy.slug}`,
  };
  if (vacancy.publication_end) schema.validThrough = vacancy.publication_end;
  if (vacancy.reference_number) {
    schema.identifier = {
      '@type': 'PropertyValue',
      name: 'Confair reference',
      value: vacancy.reference_number,
    };
  }
  return schema;
}

export function articleSchema(post: BlogPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_image_url ?? undefined,
    datePublished: post.published_at ?? undefined,
    author: post.author
      ? { '@type': 'Person', name: post.author }
      : { '@type': 'Organization', name: 'Confair Group' },
    publisher: { '@type': 'Organization', name: 'Confair Group', url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog-posts/${post.slug}`,
  };
}
