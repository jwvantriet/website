/**
 * Vacancies the Carerix sync publishes that the site must NOT show.
 *
 * The six below are placeholder postings for maritime and offshore — sectors
 * Confair is entering in 2026 with no open positions yet. They are booked on
 * Confair Consultancy BV, carry no location and were all posted on
 * 2026-06-28. As job ads they promised work that did not exist and were
 * invalid for Google for Jobs (no jobLocation); a buyer reading them saw
 * filler. Each now sends its visitors to the talent pool for that role.
 *
 * Keyed by Carerix id (stable across slug changes). To publish one again,
 * remove it here — or better, close it in Carerix and post a real vacancy.
 */
export type TalentPoolSector = 'maritime' | 'offshore';

export const HIDDEN_VACANCIES: Record<string, { sector: TalentPoolSector; role: string }> = {
  '342': { sector: 'offshore', role: 'rov_pilot' }, // ROV Pilot
  '343': { sector: 'offshore', role: 'wind_technician' }, // Wind Turbine Technician
  '344': { sector: 'offshore', role: 'dp_operator' }, // DPO
  '345': { sector: 'maritime', role: 'rating' }, // Able Seaman
  '346': { sector: 'maritime', role: 'marine_engineer' }, // Chief Engineer
  '347': { sector: 'maritime', role: 'deck_officer' }, // Chief Officer
};

// Filtered in code after the query rather than with `.not('carerix_id', 'in', …)`:
// SQL's NOT IN drops rows whose carerix_id is NULL, which would hide real
// vacancies too.
export function isHiddenVacancy(carerixId: string | null | undefined): boolean {
  return !!carerixId && Object.prototype.hasOwnProperty.call(HIDDEN_VACANCIES, carerixId);
}

export function withoutHidden<T extends { carerix_id: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => !isHiddenVacancy(r.carerix_id));
}

export function talentPoolPath(sector: TalentPoolSector, role?: string): string {
  return role ? `/talent-pool/${sector}?role=${role}` : `/talent-pool/${sector}`;
}
