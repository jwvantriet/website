import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: {
    default: 'Confair Group — Contracting Solutions for Aviation, Maritime & Offshore',
    template: '%s | Confair Group',
  },
  description:
    'Certified contracting and workforce solutions for safety-critical industries: aviation, maritime, and offshore energy. Global deployment, full regulatory compliance.',
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  openGraph: {
    title: 'Confair Group',
    description:
      'Contracting solutions for aviation, maritime, and offshore operations.',
    type: 'website',
  },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white text-[#222c4a]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
