import type { Metadata } from 'next';
import LegalPageLayout from '@/components/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy of Confair Consultancy BV.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="How Confair Consultancy BV collects, uses, and protects your personal data."
    >
      <p>This is the Privacy Policy of:</p>
          <p>
            <strong className="text-[#222c4a]">Confair Consultancy BV</strong>
            <br />Tennesseedreef 7e
            <br />3565 CK Utrecht
            <br />The Netherlands
            <br />
            <a href="https://www.confairaviation.com" className="text-[#407df1] hover:underline">www.confairaviation.com</a>
            <br />CoC no.: 30115681
          </p>

          <h2>Definitions</h2>
          <ul>
            <li><strong>Privacy Policy:</strong> this privacy policy</li>
            <li><strong>User:</strong> every user of the Website</li>
            <li><strong>Personal Data:</strong> the data referred to in Article 1.2</li>
            <li><strong>Confair:</strong> Confair Consultancy BV</li>
            <li><strong>Website:</strong> the website on www.confairaviation.com</li>
            <li><strong>Medical Certificate:</strong> the certificate required by the EASA regulations</li>
            <li><strong>Pilot Licence:</strong> proof of flying skills</li>
            <li><strong>Logbook:</strong> a logbook with the latest flying information</li>
            <li><strong>Confair Database:</strong> the database in which Confair registers candidates for (prospective) job vacancies</li>
          </ul>

          <h2>General</h2>
          <p>This Privacy Policy describes how Confair processes Personal Data of its Users.</p>
          <p>
            Personal Data processed by Confair in any case (provided that the User has furnished them) include name, address, city, telephone number, email address, date of birth and gender, as well as copies of the User&apos;s Medical Certificate*, Pilot License*, Logbook* and passport. Users also providing unsolicited data that can be traced to an individual agree that Confair will (or may) also process such Personal Data. Confair will store any and all data provided to it in the Confair Database.
          </p>

          <h2>Collection and Use of Personal Data</h2>
          <p>Confair collects a User&apos;s Personal Data where that User has provided such Personal Data to Confair through the Website, for purposes of being included in the Confair Database or applying for a job vacancy posted on the Website, and/or because the User wishes to contact Confair.</p>
          <p>In addition, Confair actively recruits (prospective) candidates through its network, and by consulting its clients and searching the Internet (social media). Any Personal Data available of (prospective) candidates found through these channels will also be stored in the Confair Database. After a (prospective) candidate has been contacted, and on condition that such candidate agrees, the data in the Confair Database will be supplemented and the clauses of this Privacy Policy will apply.</p>
          <p>Users that have provided their Personal Data to Confair for purposes of being included in the Confair Database or applying for a job vacancy grant Confair consent for such inclusion in the Confair Database. Confair will use the Confair Database (and, hence, the Personal Data included therein) to recruit pilots and cabin crew.</p>
          <p>Confair may approach Users included in the Confair Database in relation to a job vacancy to be filled.</p>
          <p>If Confair considers a User suitable for a job vacancy at one of its clients, Confair will disclose that User&apos;s Personal Data to its client to which Confair may possibly second the User. His/her Personal Data will not be disclosed until Confair has so notified the User and it has become clear that the User agrees to his/her introduction to the client.</p>

          <h2>Transfer to Third Parties</h2>
          <p>The provision of Personal Data by a User through the Website means that such Personal Data will be stored in the cloud. To that end, Confair will use specialists with whom/which it has concluded a data processing agreement in conformity with the statutory requirements.</p>
          <p>The purpose of disclosure of Personal Data to clients of Confair is to perform the agreements concluded with clients pursuant to which Confair undertook to supply pilots and/or cabin crew (on the basis of secondment).</p>

          <h2>Alteration/Erasure of Personal Data</h2>
          <p>Users will have the right of access to and of rectification or erasure of their Personal Data, in accordance with the provisions laid down in the General Data Protection Regulation (&quot;GDPR&quot;).</p>
          <p>If a User wishes to exercise one of these rights or has questions about this Privacy Policy, he/she may contact Confair, using the contact details provided above.</p>
          <p>Confair would emphasize that the erasure (in whole or in part) of a User&apos;s Personal Data results in it no longer being possible to approach that User for recruitment purposes or introduce him/her to clients of Confair.</p>

          <h2>Retention Period</h2>
          <p>Confair will retain Personal Data for a period of 12 months following their inclusion in the Confair Database if the User has given his/her consent to that end. The purpose of such inclusion is to be able to approach Users in the event that a new suitable job vacancy comes up. A User may at any time withdraw the consent once given.</p>
          <p>If a User has not given his/her consent for inclusion in the Confair Database for a 12-month period, his/her Personal Data will be deleted within four weeks of the application procedure having ended.</p>

          <h2>Security</h2>
          <p>Confair has taken appropriate technical and organizational measures to secure the Personal Data against loss or unlawful processing, including:</p>
          <ul>
            <li>Confair has its database servers replicated within the DC2 data center in order to serve as warm standby.</li>
            <li>
              Confair has the following backup policy implemented for archival and restorability in case of a disaster:
              <ul>
                <li>Every weekend, a full backup is created of the data and local attachment contents on our on-site backup server.</li>
                <li>Every week day, a full backup is created of the data and an incremental backup of the local attachment contents on our on-site backup server.</li>
                <li>Daily, the created backups are transported to the off-site backup server.</li>
                <li>Daily backups are stored for seven days.</li>
                <li>S3 is also subject to a daily backup to the offsite location, also with a retention period of 1 week.</li>
                <li>Weekly backups are stored in full for a week.</li>
                <li>The weekly backups of the data (excluding the attachments / S3 data) is stored for a period of two months.</li>
              </ul>
            </li>
          </ul>

          <h2>Amendments to Privacy Policy</h2>
          <p>Confair reserves the right to amend this Privacy Policy. Each amendment will be published on this page. Therefore, Confair recommends that Users regularly check back on this page for implemented amendments. The current Privacy Policy was last updated on 23 April 2018.</p>

          <h2>Data Protection Authority</h2>
          <p>Users will have the right, if they see reason to do so, to file a complaint about Confair with the Dutch Data Protection Authority [Autoriteit Persoonsgegevens], Postbus 93374, 2509 AJ The Hague, The Netherlands.</p>
    </LegalPageLayout>
  );
}
