import type { Metadata } from 'next';
import { ImageIcon, UploadCloud } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import BrandedImage from '@/components/BrandedImage';

/**
 * Internal brand image library — a review page for every image the site uses,
 * plus everything uploaded to the public `brand-images` storage bucket.
 *
 * Not linked from navigation, not in the sitemap, and noindexed: it's a
 * working tool for the marketing team, reachable only by URL.
 *
 * To add images: Supabase dashboard → Storage → brand-images → upload.
 * New files appear here automatically with their public URL.
 */

export const metadata: Metadata = {
  title: 'Image Library (internal)',
  robots: { index: false, follow: false },
};

export const revalidate = 60;

type CatalogEntry = {
  label: string;
  url: string;
  description: string;
  usedBy: string[];
};

// Every externally-hosted image currently referenced by the site or the
// blog_posts table. Labels are stable — refer to them when deciding
// reassignments ("engineers article should use E").
const CATALOG: CatalogEntry[] = [
  {
    label: 'A',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/210f479b-845e-4b02-b483-cd5c6632f93e.png',
    description: 'Offshore platform at sea with helicopter (homepage hero alt text)',
    usedBy: ['Homepage hero slide 1'],
  },
  {
    label: 'B',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/bc99b82f-113d-45ef-888d-c92551203630.png',
    description: 'Aviation cockpit with professional pilots (homepage hero alt text)',
    usedBy: ['Homepage hero slide 2', 'Blog cover: Type-Rated vs NTR captains'],
  },
  {
    label: 'C',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/dac9febe-2c04-4a6b-84e8-141c410857b7.png',
    description: 'Maritime officer on ship bridge (homepage hero alt text)',
    usedBy: ['Homepage hero slide 3', 'Blog cover: Maritime crewing compliance'],
  },
  {
    label: 'D',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/8b6c02db-e1c5-4b18-b430-178ec319f74c.png',
    description: 'Services page — aviation section image',
    usedBy: ['Services: Confair Aviation', 'Blog cover: Hiring EASA Part-66 engineers'],
  },
  {
    label: 'E',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/40d5203a-e834-4315-87cc-38f761a1d536.png',
    description: 'Services page — maritime section image',
    usedBy: ['Services: Confair Maritime', 'Blog listing fallback (Maritime)'],
  },
  {
    label: 'F',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/e771e609-e88a-478c-8ddc-3c908613be5a.png',
    description: 'Services page — offshore section image (wind turbine technician)',
    usedBy: [
      'Services: Confair Offshore',
      'Blog cover: Offshore wind technician shortage',
      'Blog listing fallback (Offshore)',
    ],
  },
  {
    label: 'G',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/29d4afd4-8a38-4bee-81b8-37dd2414c980.png',
    description: 'Aviation-themed (legacy blog cover)',
    usedBy: ['Blog cover: Future of Aviation Workforce Management', 'Blog listing fallback (Aviation/default)'],
  },
  {
    label: 'H',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/d757b182-0d7d-47a7-8a81-ef65802e4725.png',
    description: 'Maritime-themed (legacy blog cover)',
    usedBy: ['Blog cover: Maritime Safety Standards 2026'],
  },
  {
    label: 'I',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/0d2b5e42-5118-46bc-996e-66dd5123894b.png',
    description: 'Offshore-themed (legacy blog cover)',
    usedBy: ['Blog cover: Offshore Wind Energy — Growing Demand'],
  },
  {
    label: 'J',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/9c31f02f-6316-4192-b06a-035e5243c780.png',
    description: 'Industry / supply-chain themed (legacy blog cover)',
    usedBy: ['Blog cover: Building Resilient Supply Chains'],
  },
  {
    label: 'K',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/2ce4ed8e-6cf8-4d79-81af-331eb1603f85.png',
    description: 'About page image',
    usedBy: ['About page'],
  },
  {
    label: 'L',
    url: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/5baeeccb-ae7e-4702-b56c-60c2b1506a53.png',
    description: 'Team page image',
    usedBy: ['Team page'],
  },
  {
    label: 'M',
    url: '/assets/about-team-custom.png',
    description: 'Custom team photo (local asset)',
    usedBy: ['About page (team section)'],
  },
];

type StockCandidate = {
  label: string;
  slug: string;
  description: string;
  suggestedFor: string;
};

// Shortlisted Unsplash candidates (free license, commercial use, no attribution
// required). Previews load via Unsplash's download endpoint; before using one
// as a blog cover, download it from its photo page and upload it to the
// brand-images bucket so we host a stable copy ourselves.
const STOCK_CANDIDATES: StockCandidate[] = [
  {
    label: 'N',
    slug: 'an-airplane-is-being-worked-on-inside-a-hangar-MDYvXZpSnPo',
    description: 'Airplane being worked on inside a hangar',
    suggestedFor: 'ADOPTED — cover of: Hiring EASA Part-66 engineers',
  },
  {
    label: 'O',
    slug: 'a-large-container-ship-in-the-middle-of-the-ocean-GFjqsPW7NPY',
    description: 'Large container ship at sea',
    suggestedFor: 'Maritime — general / blog covers',
  },
  {
    label: 'P',
    slug: 'large-container-ship-with-cranes-in-harbor--8n2CGk7Ihk',
    description: 'Container ship with cranes in harbor',
    suggestedFor: 'Maritime / logistics',
  },
  {
    label: 'Q',
    slug: 'a-cargo-ship-being-loaded-by-a-massive-crane-J2pFaFSplUE',
    description: 'Cargo ship being loaded by crane (Hamburg)',
    suggestedFor: 'Blog: Building Resilient Supply Chains',
  },
  {
    label: 'R',
    slug: 'an-overhead-view-of-cargo-containers-and-a-crane-06axNInHp-I',
    description: 'Overhead view, Maasvlakte container terminal, Port of Rotterdam',
    suggestedFor: 'ADOPTED — cover of: Building Resilient Supply Chains',
  },
  {
    label: 'S',
    slug: 'an-oil-rig-in-the-middle-of-the-ocean-7UGmtWtWERY',
    description: 'Oil rig in the middle of the ocean',
    suggestedFor: 'Offshore O&G',
  },
  {
    label: 'T',
    slug: 'red-and-grey-oil-platform-in-sea-15mjdcU9RKI',
    description: 'Red and grey oil platform at sea',
    suggestedFor: 'Offshore O&G',
  },
  {
    label: 'U',
    slug: 'aerial-view-of-a-large-ship-with-helipad-at-sea-W61mAfn1qIY',
    description: 'Aerial view of large ship with helipad (tagged marine engineering)',
    suggestedFor: 'Offshore support / maritime',
  },
  {
    label: 'V',
    slug: 'a-group-of-wind-turbines-in-the-ocean--IaTiYqRTL8',
    description: 'Offshore wind turbines, Belgian North Sea',
    suggestedFor: 'ADOPTED — cover of: Offshore Wind Energy (legacy post)',
  },
  {
    label: 'W',
    slug: 'a-group-of-wind-turbines-in-the-water-cWUj5FrVxGM',
    description: 'Wind farm turbines in open water',
    suggestedFor: 'Offshore wind — alternative',
  },
];

function stockPreviewUrl(slug: string): string {
  return `https://unsplash.com/photos/${slug}/download?w=1600`;
}

function stockPageUrl(slug: string): string {
  return `https://unsplash.com/photos/${slug}`;
}

async function fetchBucketImages(): Promise<{ name: string; url: string }[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from('brand-images').list('', {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error || !data) return [];
    return data
      .filter((f) => !f.name.startsWith('.'))
      .map((f) => ({
        name: f.name,
        url: supabase.storage.from('brand-images').getPublicUrl(f.name).data.publicUrl,
      }));
  } catch {
    return [];
  }
}

function ImageCard({
  label,
  url,
  title,
  lines,
}: {
  label?: string;
  url: string;
  title: string;
  lines: string[];
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="relative h-48 bg-gray-100">
        <BrandedImage src={url} alt={title} imgClassName="w-full h-full object-cover" />
        {label && (
          <span className="absolute top-3 left-3 w-8 h-8 rounded-full bg-navy text-yellow font-bold flex items-center justify-center text-sm shadow">
            {label}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-navy font-semibold text-sm mb-1">{title}</p>
        {lines.map((l) => (
          <p key={l} className="text-navy-500 text-xs leading-relaxed">
            • {l}
          </p>
        ))}
      </div>
    </div>
  );
}

export default async function ImageLibraryPage() {
  const uploaded = await fetchBucketImages();

  return (
    <section className="py-16 bg-beige min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10">
          <span className="text-cblue text-sm font-semibold uppercase tracking-wider">Internal</span>
          <h1 className="text-3xl font-bold text-navy mt-2 mb-3 flex items-center gap-3">
            <ImageIcon className="w-7 h-7 text-cblue" /> Brand Image Library
          </h1>
          <p className="text-navy-500 max-w-3xl leading-relaxed">
            Every image currently in use across confair.com, plus new uploads. Refer to images by
            their letter when deciding reassignments (e.g. &ldquo;use G for the engineers
            article&rdquo;). This page is not indexed and not linked from the site.
          </p>
        </div>

        <h2 className="text-xl font-bold text-navy mb-5">In use today</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-14">
          {CATALOG.map((img) => (
            <ImageCard
              key={img.label}
              label={img.label}
              url={img.url}
              title={img.description}
              lines={img.usedBy}
            />
          ))}
        </div>

        <h2 className="text-xl font-bold text-navy mb-2">Stock candidates (Unsplash)</h2>
        <p className="text-navy-500 text-sm mb-5 max-w-3xl leading-relaxed">
          Shortlisted free-license photos (commercial use, no attribution required). Click a card
          to open its Unsplash page. To adopt one: download it there, upload it to the
          brand-images bucket below, and it becomes a stable library image we host ourselves.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-14">
          {STOCK_CANDIDATES.map((img) => (
            <a
              key={img.label}
              href={stockPageUrl(img.slug)}
              target="_blank"
              rel="noreferrer"
              className="block hover:opacity-90 transition-opacity"
            >
              <ImageCard
                label={img.label}
                url={stockPreviewUrl(img.slug)}
                title={img.description}
                lines={[`Suggested: ${img.suggestedFor}`]}
              />
            </a>
          ))}
        </div>

        <h2 className="text-xl font-bold text-navy mb-2 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-cblue" /> Uploaded to the library
        </h2>
        <p className="text-navy-500 text-sm mb-5 max-w-3xl leading-relaxed">
          Files in the <code className="bg-white px-1.5 py-0.5 rounded text-xs">brand-images</code>{' '}
          storage bucket (Supabase dashboard → Storage → brand-images → Upload). New uploads appear
          here automatically within a minute, with a public URL ready to use as a blog cover.
        </p>
        {uploaded.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-300">
            <p className="text-navy-500 text-sm">
              Nothing uploaded yet — add images via the Supabase dashboard and refresh.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {uploaded.map((img) => (
              <ImageCard key={img.name} url={img.url} title={img.name} lines={[img.url]} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
