/**
 * Which employer name a vacancy may show publicly.
 *
 * In aviation the operator is the most decision-relevant fact on a listing —
 * a 777 Captain seat at Air Atlanta and one at an unnamed lessor are different
 * jobs, with different fleets, bases, rosters and reputations. So the airline
 * belongs in the card and the page header, not three sections down under
 * "About the company".
 *
 * The exception: vacancies Carerix books against a Confair entity
 * (`Confair Consultancy BV` and friends) are our own contracting vehicle
 * standing in for a client we don't name. Rendering that as the employer would
 * tell a candidate they'd be working for us, so those listings show no
 * employer line at all and keep their existing "About the company" section.
 */

// Matches the Confair entities Carerix books confidential/own-account work
// against (currently "Confair Consultancy BV", company 511).
const OWN_ENTITY = /\bconfair\b/i;

/**
 * The employer name a listing may display, or null when there isn't one we can
 * honestly show (missing in Carerix, or one of our own entities).
 */
export function publicEmployerName(companyName: string | null | undefined): string | null {
  const name = (companyName ?? '').trim();
  if (!name) return null;
  if (OWN_ENTITY.test(name)) return null;
  return name;
}
