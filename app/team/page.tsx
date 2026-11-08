import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Linkedin, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { TeamMember } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Team',
  description: 'Meet the experienced leadership team behind Confair Group.',
  robots: { index: false, follow: false },
};

export const revalidate = 300;

const TEAM_IMG =
  '/images/site/confair-office-team.jpg';

// There used to be a hard-coded "fallback leadership" here, shown while the
// team_members table was empty: six invented people (a CEO "Jan de Vries", a
// "Director of Maritime" with a Master Mariner's licence, …). robots.txt kept
// crawlers out, but the page was live for anyone with the URL. Removed
// 2026-11-08: with no real team members the page now answers 404.

const culturePoints = [
  { title: 'Diversity & Inclusion', desc: 'We celebrate diversity and believe that varied perspectives strengthen our team and the solutions we deliver.' },
  { title: 'Continuous Development', desc: "We invest in our people's growth through training, certifications, and career development opportunities." },
  { title: 'Work-Life Balance', desc: 'We understand the demands of contract work and support our professionals in maintaining healthy work-life balance.' },
  { title: 'Safety Culture', desc: "Safety isn't just a requirement—it's a mindset we cultivate across every level of our organization." },
];

function initialsFromName(name: string) {
  return name.split(/\s+/).map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join('');
}

const PALETTE = ['#407df1', '#61bef6', '#222c4a', '#fbc134'];

export default async function TeamPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('team_members')
    .select('id, name, role, bio, photo_url, linkedin_url, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const members: TeamMember[] = (data as TeamMember[] | null) ?? [];
  if (members.length === 0) notFound();

  return (
    <>
      <section className="relative py-20 md:py-28 bg-navy overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TEAM_IMG} alt="Team" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-yellow text-sm font-semibold uppercase tracking-wider">Our Team</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">
            Meet the People Behind Confair
          </h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            A dedicated team of industry experts committed to delivering exceptional workforce
            solutions across aviation, maritime, and offshore energy.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-cblue-700 text-sm font-semibold uppercase tracking-wider">Leadership</span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mt-3 mb-4">
              Our Leadership Team
            </h2>
            <p className="text-navy-500 max-w-2xl mx-auto text-lg">
              Experienced professionals leading each division with deep industry knowledge and
              operational expertise.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {members.map((person, i) => {
              const color = PALETTE[i % PALETTE.length];
              const initials = initialsFromName(person.name);
              const photo = person.photo_url;
              return (
                <div
                  key={person.name}
                  className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all duration-300 group"
                >
                  {photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photo}
                      alt={person.name}
                      className="w-20 h-20 rounded-2xl object-cover mb-6"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 text-white text-2xl font-bold"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-navy mb-1">{person.name}</h3>
                  <p className="text-sm font-semibold mb-4" style={{ color }}>
                    {person.role}
                  </p>
                  {person.bio && (
                    <p className="text-navy-500 text-sm leading-relaxed mb-5">{person.bio}</p>
                  )}
                  <div className="flex gap-3">
                    <a
                      href={person.linkedin_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-navy-500 hover:bg-cblue hover:text-white transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                    <a
                      href="mailto:info@confair.com"
                      className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-navy-500 hover:bg-cblue hover:text-white transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-beige">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-cblue-700 text-sm font-semibold uppercase tracking-wider">Our Culture</span>
              <h2 className="text-3xl md:text-4xl font-bold text-navy mt-3 mb-6">
                A People-First Organization
              </h2>
              <p className="text-navy-500 text-lg leading-relaxed mb-8">
                At Confair, we believe that our success is built on the strength of our people. We
                foster an environment where professionals can thrive, grow, and make a meaningful
                impact.
              </p>
              <div className="space-y-6">
                {culturePoints.map((point) => (
                  <div key={point.title} className="bg-white rounded-xl p-5 shadow-sm">
                    <h4 className="font-bold text-navy mb-1">{point.title}</h4>
                    <p className="text-navy-500 text-sm leading-relaxed">{point.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TEAM_IMG} alt="Confair Culture" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
