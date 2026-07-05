# Confair proposal template (Proposal Studio)

Streamlined, aligned to the Company Blueprint. The **"why"** is fixed to the
**Five Promises** so every proposal tells the same story as the website and
sales cycle; everything else is client-specific.

**How to use**
1. Platform → **Marketing → Proposals → New**.
2. Fill the header fields (client, reference, validity) and paste the section
   content below, replacing every `{{PLACEHOLDER}}`. Keep the Five Promises
   as-is unless there's a reason to tailor them.
3. Publish → share the `confair.com/p/<token>` link. The client reviews the
   rate card and **signs online** (one-time email code → audit trail →
   downloadable Certificate of Electronic Signature).

Tone: professional, evidence-led, outcome-first — sell operational continuity,
not headcount. The JSON matches the `ProposalData` shape the studio stores, so
it can also seed a draft via `POST /marketing/proposals` (`{ …, data: { … } }`).

```json
{
  "client": "{{CLIENT_LEGAL_NAME}}",
  "preparedFor": "{{CONTACT NAME — ROLE, LOCATION}}",
  "title": "{{e.g. Contracted Flight Crew}}",
  "subtitle": "Certified {{ROLE/FLEET}}, sourced, verified, deployed and paid through one connected partner.",
  "reference": "{{CFR-YYYY-NNN}}",
  "date": "{{DD MONTH YYYY}}",
  "validity": "30 days",

  "requirementIntro": "Following our conversations, this proposal sets out how Confair will resource and manage the workforce for {{OPERATION / PROJECT}}.",
  "requirementBullets": "{{ROLE & HEADCOUNT — e.g. 4 x B737 Captains}}\n{{ROLE & HEADCOUNT — e.g. 4 x B737 First Officers}}\n{{BASE / LOCATION}}\n{{START & DURATION}}\n{{ROTATION / ROSTER}}",
  "requirementOutro": "Confair takes end-to-end responsibility — sourcing, compliance, contracting, mobilisation and payroll — so your operation stays crewed and compliant.",

  "whyBlocks": [
    { "heading": "Find Faster", "body": "We shorten the time between your workforce need and qualified, certified professionals — with rapid deployment where the operation demands it." },
    { "heading": "Verify Once", "body": "Every licence, medical, visa, training record and background check is collected and verified once, then monitored continuously against expiry." },
    { "heading": "Deploy With Confidence", "body": "Contracts, travel, onboarding and mobilisation are coordinated through one connected workflow, so people arrive on site ready and compliant." },
    { "heading": "Manage Transparently", "body": "Real-time visibility of every professional throughout the assignment, with payroll that flows from operational reality — not manual re-keying." },
    { "heading": "Retain & Redeploy", "body": "Profiles, compliance history and experience stay with us, so the next assignment starts faster — across projects, countries and sectors." }
  ],

  "commercialIntro": "Indicative commercial terms. All amounts in {{CURRENCY}}, net of taxes, per {{unit}} per calendar month. Under the contracting model, remuneration is administered and paid through Confair; Confair's fee is the final row.",
  "columns": ["{{COLUMN 1}}", "{{COLUMN 2}}"],
  "rows": [
    { "label": "{{Monthly crew fee}}", "values": ["{{0,000}}", "{{0,000}}"], "highlight": true },
    { "label": "{{Allowances}}", "values": ["{{000}}", "{{000}}"], "highlight": false },
    { "label": "Confair contracting fee (fixed, per {{unit}} / month)", "values": ["{{290}}", "{{290}}"], "highlight": true }
  ],
  "commercialFootnote": "{{Footnotes — what's excluded (per diems, layover hotels, leave travel, airline-provided items), replacement guarantee, etc.}}",
  "commercialCallout": "Like for like: people joining through Confair receive the same package they would applying directly — no margin on remuneration. One partner, one invoice, full audit trail.",

  "assumptions": "{{Client provides roster/duty schedule}}\nCertification requirements as listed; changes may affect lead time.\nMobilisation assumes visas / permits are obtainable within standard windows.\nRates are held for the validity period above.",

  "standardsHeaders": { "a": "Requirement", "b": "{{Senior role}}", "c": "{{Junior role}}" },
  "standardsRows": [
    { "a": "Licence", "b": "{{ATPL}}", "c": "{{CPL/ATPL}}" },
    { "a": "Medical", "b": "{{Class 1}}", "c": "{{Class 1}}" },
    { "a": "Type rating / certification", "b": "{{B737 current}}", "c": "{{B737 current}}" },
    { "a": "Experience", "b": "{{>= 5,000 h}}", "c": "{{>= 1,500 h}}" },
    { "a": "English", "b": "ICAO level 4+", "c": "ICAO level 4+" }
  ],

  "timeline": [
    { "a": "Framework agreement signed", "b": "T0 — signed online" },
    { "a": "First screened & verified CVs", "b": "T0 + 5 working days" },
    { "a": "Selection / assessment", "b": "T0 + 2-3 weeks" },
    { "a": "Contracting, visas & permits", "b": "T0 + 3-6 weeks" },
    { "a": "On site / operational", "b": "T0 + 6-8 weeks" }
  ],

  "nextSteps": "Review the commercial terms above.\nAccept online at the top of this page — you'll receive a one-time code by email to confirm your identity.\nOn acceptance we issue the framework agreement and begin compliance and mobilisation immediately.",

  "contacts": "{{ACCOUNT MANAGER}} — {{email}} — {{phone}}\nConfair Group — Utrecht, The Netherlands · Dubai, UAE"
}
```
