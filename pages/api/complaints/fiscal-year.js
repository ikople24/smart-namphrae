import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { getFiscalYearRangeThai } from '@/lib/fiscalYear';

/**
 * GET /api/complaints/fiscal-year?fiscalYear=2568&status=...&role=admin
 *
 * Returns complaints filtered by Thai fiscal year (Oct 1 - Sep 30),
 * merging data across:
 * - submittedreports
 * - submittedreports_2024 (legacy archive)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { fiscalYear, status, role } = req.query;
    if (!fiscalYear) {
      return res.status(400).json({ success: false, error: 'Missing fiscalYear' });
    }

    const { start, endExclusive } = getFiscalYearRangeThai(fiscalYear);

    const isAdmin = role === 'admin';
    const projection = isAdmin ? undefined : { fullName: 0, phone: 0 };

    const baseQuery = {
      createdAt: { $gte: start, $lt: endExclusive }
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
          __createdAt: { $gte: start, $lt: endExclusive }
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

    return res.status(200).json({ success: true, data: merged, meta: { fiscalYear: String(fiscalYear), start, endExclusive } });
  } catch (error) {
    console.error('Error fetching fiscal-year complaints:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch complaints', message: error.message });
  }
}


