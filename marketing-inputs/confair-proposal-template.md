# Confair proposal template (Proposal Studio)

A reusable starting point for online proposals, aligned to the Company
Blueprint (positioning, the Five Promises, the three verticals) and to the
online-signing flow.

**How to use it**
1. In the platform: **Dashboard → Marketing → Proposals → New**.
2. Fill the header fields (client, reference, validity) and paste the section
   content below, replacing every `{{PLACEHOLDER}}`.
3. Publish → share the `confair.com/p/<token>` link. The client reviews the
   rate card and **signs online** (one-time email code + audit trail).

The JSON block matches the `ProposalData` shape the studio stores, so it can
also be used to seed a draft programmatically via
`POST /marketing/proposals` (`{ ..., data: { … } }`).

Keep the tone from the Blueprint: professional, evidence-led, outcome-first —
sell operational continuity, not headcount.

```json
{
  "client": "{{CLIENT_LEGAL_NAME}}",
  "preparedFor": "{{CONTACT_NAME, ROLE}}",
  "title": "Workforce Solution Proposal",
  "subtitle": "Certified crew, sourced, verified, deployed and paid through one connected partner.",
  "reference": "{{CFR-YYYY-NNN}}",
  "date": "{{DD MONTH YYYY}}",
  "validity": "{{DD MONTH YYYY}}",

  "requirementIntro": "Following our conversations, this proposal sets out how Confair will resource and manage the workforce for {{OPERATION / PROJECT}}.",
  "requirementBullets": "{{ROLES & HEADCOUNT — e.g. 6 × Boeing 777 Captains}}\n{{BASE / LOCATION}}\n{{ROTATION / PATTERN}}\n{{START DATE & DURATION}}\n{{KEY CERTIFICATIONS REQUIRED}}",
  "requirementOutro": "Where scope allows, Confair takes end-to-end responsibility for crewing the operation — not just presenting candidates.",

  "whyBlocks": [
    { "heading": "Find Faster", "body": "We shorten the time between your workforce need and qualified, certified professionals — with rapid deployment where the operation demands it." },
    { "heading": "Verify Once", "body": "Every licence, medical, visa, training record and background check is collected and verified once, then monitored continuously against expiry." },
    { "heading": "Deploy With Confidence", "body": "Contracts, travel, onboarding and mobilisation are coordinated through one connected workflow, so people arrive on site ready and compliant." },
    { "heading": "Manage Transparently", "body": "You have real-time visibility of every professional throughout the assignment, and payroll flows from operational reality — not manual re-keying." },
    { "heading": "Retain & Redeploy", "body": "Profiles, compliance history and experience remain with us, so the next assignment starts faster and cheaper — across projects, countries and sectors." }
  ],

  "commercialIntro": "The commercial terms below are all-in day/duty rates unless noted. They cover recruitment, contracting, compliance management, onboarding and payroll administration.",
  "columns": ["Role", "Basis", "Rate", "Notes"],
  "rows": [
    { "label": "{{ROLE 1}}", "values": ["{{Per duty day}}", "{{€0,000}}", "{{incl. allowances}}"], "highlight": false },
    { "label": "{{ROLE 2}}", "values": ["{{Per duty day}}", "{{€0,000}}", "{{incl. allowances}}"], "highlight": false },
    { "label": "{{MANAGED OPERATION}}", "values": ["{{Monthly}}", "{{€00,000}}", "{{full-crew, end-to-end}}"], "highlight": true }
  ],
  "commercialFootnote": "Rates exclude VAT where applicable. Travel and accommodation {{included / at cost / as agreed}}.",
  "commercialCallout": "One partner, one invoice — recruitment, compliance, onboarding and payroll on a single connected platform.",

  "assumptions": "Client provides the operational roster and duty schedule.\nCertification requirements are as listed; changes may affect lead time.\nMobilisation timelines assume visas/permits are obtainable within standard windows.\nRates are held for the validity period stated above.",

  "standardsHeaders": { "a": "Aviation", "b": "Maritime", "c": "Offshore Energy" },
  "standardsRows": [
    { "a": "EASA / FAA / ICAO", "b": "STCW", "c": "GWO" },
    { "a": "Type-rated & current", "b": "Flag-state compliant", "c": "BOSIET / HUET" },
    { "a": "Medical & licence checks", "b": "Certificate validity", "c": "HSE / medical" }
  ],

  "timeline": [
    { "a": "Acceptance", "b": "Day 0 — signed online" },
    { "a": "Compliance & verification", "b": "{{Days 1–X}}" },
    { "a": "Contracting & onboarding", "b": "{{Days X–Y}}" },
    { "a": "Mobilisation & travel", "b": "{{Days Y–Z}}" },
    { "a": "On site / operational", "b": "{{Target date}}" }
  ],

  "nextSteps": "Review the commercial terms above.\nAccept online at the top of this page — you'll receive a one-time code by email to confirm your identity.\nOn acceptance we issue the framework agreement and begin compliance and mobilisation immediately.",

  "contacts": "{{ACCOUNT MANAGER NAME}} — {{email}} — {{phone}}\nConfair Group — Utrecht, The Netherlands · Dubai, UAE"
}
```
