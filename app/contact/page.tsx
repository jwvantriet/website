import type { Metadata } from 'next';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: "Get in touch with Confair Group — clients seeking workforce solutions or candidates looking for new opportunities.",
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-[#222c4a] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">Get in Touch</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">Contact Us</h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Whether you&apos;re a client looking for workforce solutions or a candidate seeking new
            opportunities, we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-5 gap-16">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-[#222c4a] mb-6">How to Reach Us</h2>
              <p className="text-[#5a6275] leading-relaxed mb-8">
                Our team is ready to assist you with workforce solutions tailored to your needs.
                Reach out through any of the channels below.
              </p>

              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#222c4a] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#407df1]" />
                  HQ Netherlands
                </h3>
                <div className="space-y-4 pl-4">
                  <ContactInfoRow icon={<MapPin className="w-4 h-4 text-[#407df1]" />} bg="bg-[#407df1]/10">
                    Tennesseedreef 7e, 3565 CK Utrecht
                  </ContactInfoRow>
                  <ContactInfoRow icon={<Phone className="w-4 h-4 text-[#407df1]" />} bg="bg-[#407df1]/10">
                    +31 850 711 950
                  </ContactInfoRow>
                  <ContactInfoRow icon={<Mail className="w-4 h-4 text-[#407df1]" />} bg="bg-[#407df1]/10">
                    netherlands@confair.com
                  </ContactInfoRow>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#222c4a] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#fbc134]" />
                  HQ Middle East – Dubai
                </h3>
                <div className="space-y-4 pl-4">
                  <ContactInfoRow icon={<MapPin className="w-4 h-4 text-[#fbc134]" />} bg="bg-[#fbc134]/10">
                    The Prime Tower, Office 2001-25, Business Bay, Dubai
                  </ContactInfoRow>
                  <ContactInfoRow icon={<Phone className="w-4 h-4 text-[#fbc134]" />} bg="bg-[#fbc134]/10">
                    +971 55 692 4772
                  </ContactInfoRow>
                  <ContactInfoRow icon={<Mail className="w-4 h-4 text-[#fbc134]" />} bg="bg-[#fbc134]/10">
                    uae@confair.com
                  </ContactInfoRow>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#407df1]/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#407df1]" />
                </div>
                <div>
                  <h4 className="font-bold text-[#222c4a] mb-1">Business Hours</h4>
                  <p className="text-[#5a6275] text-sm">Mon – Fri: 08:00 – 18:00 CET / GST</p>
                </div>
              </div>

              <div className="mt-10 p-6 bg-[#f2eee7] rounded-2xl">
                <h4 className="font-bold text-[#222c4a] mb-3">Quick Links</h4>
                <div className="space-y-2">
                  <a href="mailto:aviation@confair.com" className="block text-sm text-[#407df1] hover:underline">
                    Aviation inquiries → aviation@confair.com
                  </a>
                  <a href="mailto:maritime@confair.com" className="block text-sm text-[#407df1] hover:underline">
                    Maritime inquiries → maritime@confair.com
                  </a>
                  <a href="mailto:offshore@confair.com" className="block text-sm text-[#407df1] hover:underline">
                    Offshore inquiries → offshore@confair.com
                  </a>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactInfoRow({
  icon,
  bg,
  children,
}: {
  icon: React.ReactNode;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
      <div>
        <p className="text-[#5a6275] text-sm">{children}</p>
      </div>
    </div>
  );
}
