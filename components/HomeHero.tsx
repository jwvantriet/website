import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import heroPhoto from '@/public/images/site/confair-flight-simulator-session.jpg';

/**
 * Homepage hero: one real photo (Confair's own shoot), not the three-image
 * auto-rotating slider of AI-generated pictures it replaced on 2026-11-08.
 * A single next/image with `priority` is the page's LCP element — served as
 * an optimised, responsive WebP from our own domain — and with nothing
 * rotating there is no motion to pause (WCAG 2.2.2). Server component.
 */
export default function HomeHero() {
  return (
    // Sized so the stats strip below always sits in the viewport:
    //   - mobile: 70vh keeps the hero visually impactful
    //   - md+: viewport minus ~100px header minus ~150px stats
    //   - capped at 720px on very tall desktops so the headline doesn't drift
    <section className="relative min-h-[70vh] md:min-h-[calc(100svh-250px)] md:max-h-[720px] flex items-center overflow-hidden bg-navy">
      <Image
        src={heroPhoto}
        alt="A Confair consultant and two colleagues in a flight simulator during a pilot session"
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="object-cover object-[60%_center]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-800/90 via-navy/70 to-navy/20" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-yellow/15 border border-yellow/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-yellow" />
            <span className="text-yellow text-sm font-semibold">
              Supporting Critical Operations Worldwide
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Contracting Solutions for Aviation, Maritime &amp; Offshore Operations
          </h1>
          <p className="text-white/80 text-lg md:text-xl leading-relaxed mb-8">
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
    </section>
  );
}
