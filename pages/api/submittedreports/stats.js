/**
 * /api/submittedreports/stats
 * GET  –  returns an aggregated snapshot for the dashboard cards:
 *   {
 *     inProgress: <Number>,     // reports that are *not* completed
 *     completed:  <Number>,     // reports that are completed
 *     satisfaction: <Number>    // average satisfaction (0‑100) rounded – optional, `null` if none
 *     latestUpdate: <Date|null> // latest updatedAt of inProgress reports or null
 *   }
 *
 * The route uses the same Mongo connection helper the rest of the
 * project relies on (`lib/dbConnect`) and **never** creates models
 * twice thanks to the `mongoose.models` guard.
 */

import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { getFiscalYearRangeThai, getThaiFiscalYear } from '@/lib/fiscalYear';

const REPORT_COLLECTION = 'submittedreports';
const REPORT_COLLECTION_2024 = 'submittedreports_2024';
const SATISFACTION_COLLECTION = 'satisfactions'; // adjust if your collection name differs

const Satisfaction =
  mongoose.models.Satisfaction ||
  mongoose.model('Satisfaction', new mongoose.Schema({}, { strict: false, collection: SATISFACTION_COLLECTION }));

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

function dateFieldToDateExpr(fieldName) {
  return {
    $cond: [
      { $eq: [{ $type: `$${fieldName}` }, 'date'] },
      `$${fieldName}`,
      {
        $dateFromString: {
          dateString: `$${fieldName}`,
          onError: null,
          onNull: null
        }
      }
    ]
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    // Default: current Thai fiscal year (Oct 1 - Sep 30)
    const fyFromQueryRaw = req.query?.fiscalYear;
    const fyFromQuery = fyFromQueryRaw ? Number(fyFromQueryRaw) : null;
    const fiscalYearThai = Number.isFinite(fyFromQuery) ? fyFromQuery : getThaiFiscalYear(new Date());
    const { start: fyStart, endExclusive: fyEndExclusive } = getFiscalYearRangeThai(fiscalYearThai);
    const monthRange = parseMonthYYYYMM(req.query?.month);
    const range = monthRange ? clampRange(monthRange.start, monthRange.endExclusive, fyStart, fyEndExclusive) : { start: fyStart, endExclusive: fyEndExclusive };
    if (!range) {
      return res.json({
        inProgress: 0,
        completed: 0,
        completedChange: null,
        satisfaction: null,
        latestUpdate: null,
        fiscalYear: fiscalYearThai,
        month: monthRange ? `${monthRange.year}-${String(monthRange.monthNum).padStart(2, '0')}` : null,
        range: { start: fyStart, endExclusive: fyEndExclusive }
      });
    }

    const mainCol = mongoose.connection.db.collection(REPORT_COLLECTION);
    const legacy2024Col = mongoose.connection.db.collection(REPORT_COLLECTION_2024);

    // 1) completed – documents that have `status` === "ดำเนินการเสร็จสิ้น"
    // 2) in progress – documents that have `status` === "อยู่ระหว่างดำเนินการ"
    const completedQuery = { status: 'ดำเนินการเสร็จสิ้น', createdAt: { $gte: range.start, $lt: range.endExclusive } };
    const inProgressQuery = { status: 'อยู่ระหว่างดำเนินการ', createdAt: { $gte: range.start, $lt: range.endExclusive } };

    const legacyCount = async (status, start, endExclusive) => {
      const rows = await legacy2024Col
        .aggregate([
          { $addFields: { __createdAt: dateFieldToDateExpr('createdAt') } },
          { $match: { status, __createdAt: { $gte: start, $lt: endExclusive } } },
          { $count: 'count' }
        ])
        .toArray();
      return rows?.[0]?.count ?? 0;
    };

    const [completedMain, completedLegacy, inProgressMain, inProgressLegacy] = await Promise.all([
      mainCol.countDocuments(completedQuery),
      legacyCount('ดำเนินการเสร็จสิ้น', range.start, range.endExclusive),
      mainCol.countDocuments(inProgressQuery),
      legacyCount('อยู่ระหว่างดำเนินการ', range.start, range.endExclusive)
    ]);

    const completed = (completedMain || 0) + (completedLegacy || 0);
    const inProgress = (inProgressMain || 0) + (inProgressLegacy || 0);

    // completedChange: compare selected month vs previous month (or current vs previous if no month param)
    const now = new Date();
    const selectedMonthStart = monthRange ? monthRange.start : new Date(now.getFullYear(), now.getMonth(), 1);
    const selectedMonthEndExclusive = monthRange ? monthRange.endExclusive : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevMonthStart = new Date(selectedMonthStart.getFullYear(), selectedMonthStart.getMonth() - 1, 1);
    const prevMonthEndExclusive = selectedMonthStart;

    const prevMonthClamped = clampRange(prevMonthStart, prevMonthEndExclusive, fyStart, fyEndExclusive);
    const currentMonthClamped = clampRange(selectedMonthStart, selectedMonthEndExclusive, fyStart, fyEndExclusive);

    const [previousMonthCompletedMain, previousMonthCompletedLegacy, currentMonthCompletedMain, currentMonthCompletedLegacy] =
      await Promise.all([
        prevMonthClamped
          ? mainCol.countDocuments({
              status: 'ดำเนินการเสร็จสิ้น',
              createdAt: { $gte: prevMonthClamped.start, $lt: prevMonthClamped.endExclusive }
            })
          : 0,
        prevMonthClamped ? legacyCount('ดำเนินการเสร็จสิ้น', prevMonthClamped.start, prevMonthClamped.endExclusive) : 0,
        currentMonthClamped
          ? mainCol.countDocuments({
              status: 'ดำเนินการเสร็จสิ้น',
              createdAt: { $gte: currentMonthClamped.start, $lt: currentMonthClamped.endExclusive }
            })
          : 0,
        currentMonthClamped ? legacyCount('ดำเนินการเสร็จสิ้น', currentMonthClamped.start, currentMonthClamped.endExclusive) : 0
      ]);

    const previousMonthCompleted =
      (previousMonthCompletedMain || 0) + (previousMonthCompletedLegacy || 0);
    const currentMonthCompleted =
      (currentMonthCompletedMain || 0) + (currentMonthCompletedLegacy || 0);

    const completedChange = previousMonthCompleted > 0
      ? Math.round(((currentMonthCompleted - previousMonthCompleted) / previousMonthCompleted) * 100)
      : null;

    const [latestMain, latestLegacy] = await Promise.all([
      mainCol
        .find(inProgressQuery, { projection: { updatedAt: 1 } })
        .sort({ updatedAt: -1 })
        .limit(1)
        .toArray(),
      legacy2024Col
        .aggregate([
          { $addFields: { __createdAt: dateFieldToDateExpr('createdAt'), __updatedAt: dateFieldToDateExpr('updatedAt') } },
          { $match: { status: 'อยู่ระหว่างดำเนินการ', __createdAt: { $gte: range.start, $lt: range.endExclusive } } },
          { $sort: { __updatedAt: -1 } },
          { $limit: 1 },
          { $project: { updatedAt: '$__updatedAt' } }
        ])
        .toArray()
    ]);
    const latestUpdateMain = latestMain?.[0]?.updatedAt ? new Date(latestMain[0].updatedAt) : null;
    const latestUpdateLegacy = latestLegacy?.[0]?.updatedAt ? new Date(latestLegacy[0].updatedAt) : null;
    const latestUpdate =
      latestUpdateMain && latestUpdateLegacy
        ? (latestUpdateMain > latestUpdateLegacy ? latestUpdateMain : latestUpdateLegacy)
        : latestUpdateMain || latestUpdateLegacy || null;

    // ---- satisfaction ------------------------------------------------------
    let satisfaction = null; // default – not enough data
    try {
      const stats = await Satisfaction.aggregate([
        { $match: { createdAt: { $gte: range.start, $lt: range.endExclusive } } },
        {
          $group: {
            _id: '$complaintId',
            rating: { $first: '$rating' }
          }
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' }
          }
        }
      ]);

      if (stats.length && typeof stats[0].avgRating === 'number') {
        satisfaction = Math.round((stats[0].avgRating / 5) * 100); // assume rating 1‑5 → convert to %
      }
    } catch {
      /* ignore if collection is missing – keep satisfaction = null */
    }

    return res.json({
      inProgress,
      completed,
      completedChange,
      satisfaction,
      latestUpdate,
      fiscalYear: fiscalYearThai,
      month: monthRange ? `${monthRange.year}-${String(monthRange.monthNum).padStart(2, '0')}` : null,
      range: { start: range.start, endExclusive: range.endExclusive }
    });
  } catch (err) {
    console.error('📊 Stats API error:', err);
    return res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
}