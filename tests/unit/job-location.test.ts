import { describe, expect, it } from 'vitest';
import { countryCode, isNotAPlace, jobAddress } from '@/lib/job-location';
import { jobPostingSchema } from '@/lib/structured-data';
import type { Vacancy } from '@/lib/types';

describe('jobAddress', () => {
  it('reads "City, Country", the form recruiters should use in Carerix', () => {
    expect(jobAddress('Kigali, Rwanda')).toEqual({ addressLocality: 'Kigali', addressCountry: 'RW' });
    expect(jobAddress('Keflavík, Iceland')).toEqual({ addressLocality: 'Keflavík', addressCountry: 'IS' });
    expect(jobAddress('Dubai, UAE')).toEqual({ addressLocality: 'Dubai', addressCountry: 'AE' });
  });

  it('reads a bare country — the locations live on 2026-11-22', () => {
    expect(jobAddress('Spain')).toEqual({ addressCountry: 'ES' });
    expect(jobAddress('Pakistan')).toEqual({ addressCountry: 'PK' });
    expect(jobAddress('UAE')).toEqual({ addressCountry: 'AE' });
  });

  it('reads a bare city it knows', () => {
    expect(jobAddress('Helsinki')).toEqual({ addressLocality: 'Helsinki', addressCountry: 'FI' });
    expect(jobAddress('Birkirkara')).toEqual({ addressLocality: 'Birkirkara', addressCountry: 'MT' });
  });

  it('passes an unknown place through as before, without a country', () => {
    expect(jobAddress('Opava')).toEqual({ addressLocality: 'Opava' });
    expect(jobAddress('Opava, Moravia')).toEqual({ addressLocality: 'Opava, Moravia' });
  });

  it('never invents a place for text that names none', () => {
    for (const text of ['Several', 'several ', 'Europe', 'Worldwide', 'International', '', null, undefined]) {
      expect(jobAddress(text)).toBeNull();
      expect(isNotAPlace(text)).toBe(true);
    }
  });
});

describe('countryCode', () => {
  it('knows names and the short forms recruiters write', () => {
    expect(countryCode('Netherlands')).toBe('NL');
    expect(countryCode('The Netherlands')).toBe('NL');
    expect(countryCode('uk')).toBe('GB');
    expect(countryCode('Türkiye')).toBe('TR');
    expect(countryCode('Turkey')).toBe('TR');
  });

  it('does not take a region or a non-country for a country', () => {
    expect(countryCode('Europe')).toBeNull();
    expect(countryCode('European Union')).toBeNull();
    expect(countryCode('Several')).toBeNull();
  });
});

describe('jobPostingSchema location', () => {
  const vacancy = (location: string | null) =>
    ({
      slug: 'tr-a330-captain-349',
      title: 'TR A330 Captain',
      industry: 'Aviation',
      location,
      employment_type: 'Contract',
      posted_date: '2026-09-17T12:00:00+00:00',
      publication_start: '2026-09-17T12:00:00+00:00',
      publication_end: null,
      company_name: 'Rwandair',
    }) as unknown as Vacancy;

  const address = (location: string | null) =>
    (jobPostingSchema(vacancy(location)).jobLocation as { address: Record<string, string> }).address;

  it('sends the country Google asks for when the text gives one', () => {
    expect(address('Kigali, Rwanda')).toEqual({
      '@type': 'PostalAddress',
      addressLocality: 'Kigali',
      addressCountry: 'RW',
    });
    expect(address('Spain')).toEqual({ '@type': 'PostalAddress', addressCountry: 'ES' });
  });

  it('leaves a vacancy without a real place exactly as it was sent before', () => {
    expect(address('Several')).toEqual({ '@type': 'PostalAddress', addressLocality: 'Several' });
    expect(address(null)).toEqual({ '@type': 'PostalAddress', addressLocality: 'International' });
  });
});
