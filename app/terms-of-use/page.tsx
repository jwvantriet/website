import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms of use for confair.com.',
};

export default function TermsOfUsePage() {
  return (
    <>
      <section className="bg-[#222c4a] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">Legal</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">Terms of Use</h1>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 prose prose-slate prose-headings:text-[#222c4a] prose-headings:font-bold prose-p:text-[#5a6275] prose-li:text-[#5a6275] prose-a:text-[#407df1] max-w-none">
          <p>
            This page (together with the Policies and other documents referred to in it) tells you
            the terms of use on which you may make use of this website{' '}
            <a href="https://www.confairaviation.com" className="text-[#407df1] hover:underline">
              www.confairaviation.com
            </a>
            , whether as a guest or a registered user. Please read these terms of use carefully
            before you start to use this website, as these will apply to your use of this website.
            We recommend that you print a copy of these terms of use for future reference.
          </p>
          <p>
            By using this website, you confirm that you accept these terms of use and that you agree
            to comply with them. If you do not agree to these terms of use, you must not use this
            website. We may revise these terms of use at any time by amending this page. Please
            therefore check this page from time to time to take notice of any changes we make, as
            they are binding on you.
          </p>

          <h2>Accessing Our Website</h2>
          <p>
            We do not guarantee that this website, or any content on it, will always be available or
            be uninterrupted. Access to this website is permitted on a temporary basis. We may
            suspend, withdraw, discontinue or change all or any part of this website without notice.
            We will not be liable to you if for any reason this website is unavailable at any time
            or for any period. We do not guarantee that this website will be secure or free from
            bugs or viruses. You should use your own virus protection software.
          </p>

          <p className="font-semibold mt-6">By accessing this website, you agree:</p>
          <ul>
            <li>
              That you are responsible for making all arrangements necessary for you to have access
              to this website, and for ensuring that all persons who access this website through
              your internet connection are aware of these terms of use, and that they comply with
              them.
            </li>
            <li>
              That you are responsible for any information that you upload to our website and that
              we have a right to use, copy, distribute and disclose such information to third
              parties for any purpose.
            </li>
            <li>
              To comply with all applicable laws and regulatory requirements relating to your use of
              this website and not to:
              <ul>
                <li>
                  Use this website to distribute any information or data in contravention of any
                  regulation or legislation (including, but not limited to, regulation or
                  legislation governing financial services, money laundering or anti-terrorism).
                </li>
                <li>
                  Misuse this website by knowingly introducing viruses, trojans, worms, logic bombs
                  or other material which is malicious or technologically harmful.
                </li>
                <li>
                  Attempt to gain unauthorized access to this website, the server on which this
                  website is stored or any server, computer or database connected to this website.
                </li>
                <li>
                  Attack this website via a denial-of-service attack or a distributed denial-of-service attack.
                </li>
                <li>
                  Copy, amend, reproduce or distribute the content, or disclose the content to third
                  parties, other than in compliance with these terms of use.
                </li>
                <li>
                  Advertise or sell any goods or services to other users of this website, or to
                  benefit commercially from website content.
                </li>
                <li>
                  Send unsolicited emails for advertising, market research or illegal or immoral
                  purposes to the email addresses provided on this website. Unsolicited emails to
                  Confair Consultancy BV will not be considered confidential, may be disclosed to
                  others, may not receive a response, and do not create a client relationship with
                  Confair Consultancy BV.
                </li>
              </ul>
            </li>
          </ul>

          <h2>Linking to Our Website</h2>
          <p>
            You may link to our home page, provided you do so in a way that is fair and legal and
            does not damage our reputation or take advantage of it. Accordingly, you must not:
          </p>
          <ul>
            <li>
              Establish a link in such a way as to suggest any form of association, approval or
              endorsement on our part where none exists.
            </li>
            <li>Establish a link to this website in any website that is not owned by you.</li>
            <li>
              Frame this website on any other website, nor may you create a link to any part of this
              website other than the home page.
            </li>
          </ul>
          <p>
            We reserve the right to withdraw linking permission without notice. If you wish to make
            any use of content on this website other than that set out above, please contact us.
          </p>
        </div>
      </section>
    </>
  );
}
