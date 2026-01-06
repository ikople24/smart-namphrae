/**
 * Thai fiscal year helpers.
 *
 * Fiscal year definition:
 * - Starts: 1 Oct (previous Gregorian year)
 * - Ends:   30 Sep (fiscal Gregorian year)
 *
 * Example:
 * - Thai FY 2568 (Gregorian FY 2025) => 2024-10-01 .. 2025-10-01 (endExclusive)
 */

export function getThaiFiscalYear(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  const fiscalGregorianYear = month >= 9 ? year + 1 : year; // Oct-Dec belongs to next FY
  return fiscalGregorianYear + 543;
}

export function getFiscalYearRangeThai(fiscalYearThai) {
  const fyThai = Number(fiscalYearThai);
  if (!Number.isFinite(fyThai)) {
    throw new Error(`Invalid fiscalYearThai: ${fiscalYearThai}`);
  }

  const fiscalGregorianYear = fyThai - 543;
  const start = new Date(fiscalGregorianYear - 1, 9, 1, 0, 0, 0, 0); // Oct 1 of previous year
  const endExclusive = new Date(fiscalGregorianYear, 9, 1, 0, 0, 0, 0); // Oct 1 of FY year

  return { start, endExclusive };
}


