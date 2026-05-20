import type { Metadata } from 'next';
import { Target, Eye, Heart, Shield, Users, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description: 'Confair is a specialized contracting and workforce solutions provider for safety-critical industries.',
};

const ABOUT_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/2ce4ed8e-6cf8-4d79-81af-331eb1603f85.png';
const TEAM_IMG = '/assets/about-team-custom.png';

const values = [
  { icon: Shield, title: 'Safety First', description: 'Safety is at the core of every deployment. We ensure every professional meets the highest safety standards and certifications required within their operating environment.' },
  { icon: Award, title: 'Compliance', description: 'We operate in full alignment with international regulations, industry standards, and local requirements across all jurisdictions.' },
  { icon: Users, title: 'People-Focused', description: 'We build long-term relationships with both clients and professionals, based on trust, transparency, and consistent performance.' },
  { icon: Target, title: 'Operational Excellence', description: 'Every deployment is executed with precision, ensuring seamless integration of our professionals into complex operational environments.' },
  { icon: Eye, title: 'Transparency', description: 'We maintain clear communication and full visibility throughout every engagement, ensuring alignment at every stage.' },
  { icon: Heart, title: 'Reliability', description: 'We deliver the right professionals, with the right qualifications, exactly when they are needed.' },
];

const milestones = [
  { year: '2007', event: 'Confair founded in IJmuiden, The Netherlands, focusing on aviation workforce solutions' },
  { year: '2015', event: "New ownership established, marking the start of Confair's expansion into multiple industries" },
  { year: '2016', event: 'Headquarters established in Utrecht, The Netherlands' },
  { year: '2018', event: 'Reached 2,000+ professionals deployed globally' },
  { year: '2021', event: 'Expansion into renewable offshore energy (offshore wind)' },
  { year: '2022', event: 'Incorporation of Confair Middle East (UAE) to support regional operations' },
  { year: '2024', event: 'Operating in 40+ countries with 3,000+ professionals deployed' },
  { year: 'Today', event: 'Supporting global operations across aviation, maritime, and offshore energy with a strong focus on compliance, safety, and operational continuity' },
];

const dotColors = ['#222c4a', '#407df1', '#fbc134', '#222c4a', '#407df1', '#fbc134', '#222c4a', '#fbc134'];

export default function AboutPage() {
  return (
    <>
      <section className="relative py-20 md:py-28 bg-[#222c4a] overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ABOUT_IMG} alt="About Confair" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">About Us</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">Who We Are</h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Confair is a specialized contracting and workforce solutions provider operating in
            safety-critical industries, including aviation, maritime, and offshore energy.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#407df1] text-sm font-semibold uppercase tracking-wider">Our Story</span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#222c4a] mt-3 mb-6">
                Built on Expertise, Driven by People
              </h2>
              <p className="text-[#5a6275] text-lg leading-relaxed mb-6">
                Founded in the Netherlands, Confair has grown into a trusted partner for
                organizations operating in some of the world&apos;s most demanding, safety-critical
                industries.
              </p>
              <p className="text-[#5a6275] leading-relaxed mb-6">
                We understand that in complex operational environments, the quality of your people
                directly determines the safety, reliability, and performance of your operations.
              </p>
              <p className="text-[#5a6275] leading-relaxed mb-6">
                Our expertise is structured across three core verticals: Confair Aviation, Confair
                Maritime, and Confair Offshore. Each focuses on delivering sector-specific knowledge
                and highly skilled, certified professionals for both short- and long-term assignments
                worldwide.
              </p>
              <p className="text-[#5a6275] leading-relaxed">
                We support two key audiences: clients seeking compliant, reliable workforce
                solutions, and professionals looking for international contract opportunities in
                their field.
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TEAM_IMG} alt="Confair Team" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-[#f2eee7]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#407df1] text-sm font-semibold uppercase tracking-wider">Our Values</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#222c4a] mt-3 mb-4">
              What Drives Our Operations
            </h2>
            <p className="text-[#5a6275] max-w-2xl mx-auto text-lg">
              Our values guide how we operate, how we select our professionals, and how we support
              our clients in critical environments.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((v) => (
              <div
                key={v.title}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-[#407df1]/10 flex items-center justify-center mb-5">
                  <v.icon className="w-7 h-7 text-[#407df1]" />
                </div>
                <h3 className="text-lg font-bold text-[#222c4a] mb-3">{v.title}</h3>
                <p className="text-[#5a6275] text-sm leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#407df1] text-sm font-semibold uppercase tracking-wider">Our Journey</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#222c4a] mt-3">Key Milestones</h2>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="relative min-w-[1000px] mx-auto" style={{ width: 'max-content' }}>
              <div className="flex">
                {milestones.map((m, i) => (
                  <div
                    key={m.year}
                    className="flex-shrink-0 flex flex-col items-center justify-end"
                    style={{ width: 155 }}
                  >
                    {i % 2 === 0 ? (
                      <>
                        <div className="px-2 text-center mb-3">
                          <p className="text-xs leading-relaxed text-[#5a6275]">{m.event}</p>
                        </div>
                        <div className="w-px" style={{ height: 32, backgroundColor: '#407df1' }} />
                      </>
                    ) : (
                      <div style={{ height: 1 }} />
                    )}
                  </div>
                ))}
              </div>

              <div className="relative flex items-center" style={{ height: 52 }}>
                <div
                  className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full"
                  style={{ background: 'linear-gradient(to right, #222c4a, #407df1, #fbc134)' }}
                />
                <div className="relative flex w-full">
                  {milestones.map((m, i) => {
                    const dotColor = dotColors[i];
                    return (
                      <div
                        key={m.year}
                        className="flex-shrink-0 flex flex-col items-center"
                        style={{ width: 155 }}
                      >
                        <div
                          className="w-4 h-4 rounded-full border-[3px] bg-white"
                          style={{ borderColor: dotColor }}
                        />
                        <span className="mt-1.5 font-bold text-sm" style={{ color: dotColor }}>
                          {m.year}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex">
                {milestones.map((m, i) => (
                  <div
                    key={m.year}
                    className="flex-shrink-0 flex flex-col items-center justify-start"
                    style={{ width: 155 }}
                  >
                    {i % 2 !== 0 ? (
                      <>
                        <div className="w-px" style={{ height: 32, backgroundColor: '#fbc134' }} />
                        <div className="px-2 text-center mt-3">
                          <p className="text-xs leading-relaxed text-[#5a6275]">{m.event}</p>
                        </div>
                      </>
                    ) : (
                      <div style={{ height: 1 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-[#5a6275]/60 mt-4 md:hidden">
            ← Scroll horizontally to explore →
          </p>
        </div>
      </section>
    </>
  );
}
