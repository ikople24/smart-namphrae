import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { getFiscalYearRangeThai } from '@/lib/fiscalYear';

/**
 * GET /api/complaints/fiscal-year?fiscalYear=2568&status=...&role=admin
 * Optional:
 * - month=YYYY-MM (Gregorian), e.g. 2024-10
 *
 * Returns complaints filtered by Thai fiscal year (Oct 1 - Sep 30),
 * merging data across:
 * - submittedreports
 * - submittedreports_2024 (legacy archive)
 */
function parseMonthYYYYMM(month) {
  if (!month || typeof month !== 'string') return null;
  const m = month.trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const monthNum = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) return null;
  const start = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
  const endExclusive = new Date(year, monthNum, 1, 0, 0, 0, 0);
  return { start, endExclusive, year, monthNum };
}

function clampRange(rangeStart, rangeEndExclusive, clampStart, clampEndExclusive) {
  const start = new Date(Math.max(rangeStart.getTime(), clampStart.getTime()));
  const endExclusive = new Date(Math.min(rangeEndExclusive.getTime(), clampEndExclusive.getTime()));
  if (start >= endExclusive) return null;
  return { start, endExclusive };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { fiscalYear, status, role, month } = req.query;
    if (!fiscalYear) {
      return res.status(400).json({ success: false, error: 'Missing fiscalYear' });
    }

    const { start: fyStart, endExclusive: fyEndExclusive } = getFiscalYearRangeThai(fiscalYear);
    const monthRange = parseMonthYYYYMM(month);
    const range = monthRange ? clampRange(monthRange.start, monthRange.endExclusive, fyStart, fyEndExclusive) : { start: fyStart, endExclusive: fyEndExclusive };
    if (!range) {
      return res.status(200).json({
        success: true,
        data: [],
        meta: { fiscalYear: String(fiscalYear), month: monthRange ? `${monthRange.year}-${String(monthRange.monthNum).padStart(2, '0')}` : null, start: fyStart, endExclusive: fyEndExclusive }
      });
    }

    const isAdmin = role === 'admin';
    const projection = isAdmin ? undefined : { fullName: 0, phone: 0 };

    const baseQuery = {
      createdAt: { $gte: range.start, $lt: range.endExclusive }
    };
    const query = status ? { ...baseQuery, status } : baseQuery;

    const mainCol = mongoose.connection.db.collection('submittedreports');
    const legacy2024Col = mongoose.connection.db.collection('submittedreports_2024');

    // Legacy collection may store createdAt as string; normalize via aggregation.
    const legacyPipeline = [
      {
        $addFields: {
          __createdAt: {
            $cond: [
              { $eq: [{ $type: '$createdAt' }, 'date'] },
              '$createdAt',
              {
                $dateFromString: {
                  dateString: '$createdAt',
                  onError: null,
                  onNull: null
                }
              }
            ]
          }
        }
      },
      {
        $match: {
          ...(status ? { status } : {}),
          __createdAt: { $gte: range.start, $lt: range.endExclusive }
        }
      },
      { $set: { createdAt: '$__createdAt' } },
      { $unset: '__createdAt' },
      ...(isAdmin ? [] : [{ $unset: ['fullName', 'phone'] }]),
      { $sort: { createdAt: -1 } }
    ];

    const [mainDocs, legacyDocs] = await Promise.all([
      mainCol
        .find(query, projection ? { projection } : undefined)
        .sort({ createdAt: -1 })
        .toArray(),
      legacy2024Col.aggregate(legacyPipeline).toArray()
    ]);

    const merged = [...(Array.isArray(mainDocs) ? mainDocs : []), ...(Array.isArray(legacyDocs) ? legacyDocs : [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      data: merged,
      meta: {
        fiscalYear: String(fiscalYear),
        month: monthRange ? `${monthRange.year}-${String(monthRange.monthNum).padStart(2, '0')}` : null,
        start: range.start,
        endExclusive: range.endExclusive,
        fyStart,
        fyEndExclusive
      }
    });
  } catch (error) {
    console.error('Error fetching fiscal-year complaints:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch complaints', message: error.message });
  }
}


