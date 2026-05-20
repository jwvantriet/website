import type { Metadata } from 'next';
import { Linkedin, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { TeamMember } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Team',
  description: 'Meet the experienced leadership team behind Confair Group.',
};

export const revalidate = 300;

const TEAM_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/5baeeccb-ae7e-4702-b56c-60c2b1506a53.png';

// Fallback leadership shown when the team_members table is still empty.
const fallbackLeadership = [
  { name: 'Jan de Vries', role: 'Chief Executive Officer', bio: 'With over 20 years of experience in workforce solutions for safety-critical industries, Jan founded Confair with a vision to bridge the gap between skilled professionals and demanding operational environments.', initials: 'JV', color: '#407df1' },
  { name: 'Sarah Mitchell', role: 'Director of Aviation', bio: 'Former airline operations manager with 15 years in aviation. Sarah leads our aviation division, ensuring we deliver EASA and FAA-compliant professionals to clients worldwide.', initials: 'SM', color: '#61bef6' },
  { name: 'Erik Bakker', role: 'Director of Maritime', bio: "A seasoned maritime professional with a Master Mariner's license and extensive shore-side management experience. Erik oversees our maritime workforce solutions globally.", initials: 'EB', color: '#222c4a' },
  { name: 'Lisa Andersen', role: 'Director of Offshore', bio: "With a background in offshore energy engineering and HSE management, Lisa drives our offshore division's growth in both traditional energy and renewables.", initials: 'LA', color: '#fbc134' },
  { name: 'Thomas Kramer', role: 'Head of Compliance', bio: 'Thomas ensures all our operations meet international regulatory standards. His expertise spans aviation, maritime, and offshore compliance frameworks.', initials: 'TK', color: '#407df1' },
  { name: 'Maria Santos', role: 'Head of Talent Acquisition', bio: 'Maria leads our global recruitment team, building and maintaining our network of over 3,000 certified professionals across all three verticals.', initials: 'MS', color: '#61bef6' },
];

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
  const useFallback = members.length === 0;

  return (
    <>
      <section className="relative py-20 md:py-28 bg-[#222c4a] overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TEAM_IMG} alt="Team" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">Our Team</span>
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
            <span className="text-[#407df1] text-sm font-semibold uppercase tracking-wider">Leadership</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#222c4a] mt-3 mb-4">
              Our Leadership Team
            </h2>
            <p className="text-[#5a6275] max-w-2xl mx-auto text-lg">
              Experienced professionals leading each division with deep industry knowledge and
              operational expertise.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(useFallback ? fallbackLeadership : members).map((person, i) => {
              const color = 'color' in person ? person.color : PALETTE[i % PALETTE.length];
              const initials = 'initials' in person ? person.initials : initialsFromName(person.name);
              const photo = !useFallback ? (person as TeamMember).photo_url : null;
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
                  <h3 className="text-xl font-bold text-[#222c4a] mb-1">{person.name}</h3>
                  <p className="text-sm font-semibold mb-4" style={{ color }}>
                    {person.role}
                  </p>
                  {person.bio && (
                    <p className="text-[#5a6275] text-sm leading-relaxed mb-5">{person.bio}</p>
                  )}
                  <div className="flex gap-3">
                    <a
                      href={(person as TeamMember).linkedin_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-[#5a6275] hover:bg-[#407df1] hover:text-white transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                    <a
                      href="mailto:info@confair.com"
                      className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-[#5a6275] hover:bg-[#407df1] hover:text-white transition-colors"
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

      <section className="py-20 md:py-28 bg-[#f2eee7]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#407df1] text-sm font-semibold uppercase tracking-wider">Our Culture</span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#222c4a] mt-3 mb-6">
                A People-First Organization
              </h2>
              <p className="text-[#5a6275] text-lg leading-relaxed mb-8">
                At Confair, we believe that our success is built on the strength of our people. We
                foster an environment where professionals can thrive, grow, and make a meaningful
                impact.
              </p>
              <div className="space-y-6">
                {culturePoints.map((point) => (
                  <div key={point.title} className="bg-white rounded-xl p-5 shadow-sm">
                    <h4 className="font-bold text-[#222c4a] mb-1">{point.title}</h4>
                    <p className="text-[#5a6275] text-sm leading-relaxed">{point.desc}</p>
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
