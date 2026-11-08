'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// The homepage hero: the only part of the homepage that needs the browser
// (the rotating background). Split out of app/page.tsx so the page itself is a
// server component and can export metadata (canonical, share image).

const heroSlides = [
  {
    image:
      'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/210f479b-845e-4b02-b483-cd5c6632f93e.png',
    alt: 'Offshore platform at sea with helicopter',
  },
  {
    image:
      'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/bc99b82f-113d-45ef-888d-c92551203630.png',
    alt: 'Aviation cockpit with professional pilots',
  },
  {
    image:
      'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/dac9febe-2c04-4a6b-84e8-141c410857b7.png',
    alt: 'Maritime officer on ship bridge',
  },
];

const SLIDE_INTERVAL = 6000;

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % heroSlides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [next]);

  return (
    // Sized so the stats strip below always sits in the viewport:
    //   - mobile: 70vh keeps the hero visually impactful
    //   - md+: viewport minus ~100px header minus ~150px stats
    //   - capped at 720px on very tall desktops so the headline doesn't drift
    <section className="relative min-h-[70vh] md:min-h-[calc(100svh-250px)] md:max-h-[720px] flex items-center overflow-hidden">
      {heroSlides.map((slide, index) => (
        <div
          key={slide.alt}
          className="absolute inset-0 bg-cover bg-center transition-opacity ease-in-out"
          style={{
            backgroundImage: `url(${slide.image})`,
            opacity: index === current ? 1 : 0,
            transitionDuration: '1500ms',
          }}
          aria-hidden={index !== current}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-navy-800/90 via-navy/75 to-navy/40" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-yellow/15 border border-yellow/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-yellow animate-pulse" />
            <span className="text-yellow text-sm font-semibold">
              Supporting Critical Operations Worldwide
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Contracting Solutions for Aviation, Maritime &amp; Offshore Operations
          </h1>
          <p className="text-white/70 text-lg md:text-xl leading-relaxed mb-8">
            Certified professionals — sourced, verified, deployed and paid through one
            connected partner — keeping your operations running across aviation, maritime
            and offshore energy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-yellow text-navy px-7 py-3.5 rounded-lg font-bold hover:bg-yellow-600 transition-colors"
            >
              Request Workforce <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/industries"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-7 py-3.5 rounded-lg font-bold hover:border-yellow hover:text-yellow transition-colors"
            >
              Explore Industries
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
        {heroSlides.map((slide, index) => (
          <button
            key={slide.alt}
            onClick={() => setCurrent(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index === current ? 'w-10 bg-yellow' : 'w-4 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
