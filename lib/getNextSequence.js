import dbConnect from './dbConnect';
import mongoose from 'mongoose';
import { getThaiFiscalYear } from './fiscalYear';

export default async function getNextSequence(sequenceName) {
  await dbConnect();
  const db = mongoose.connection.db;
  const counters = db.collection('counters');

  const fiscalYear = getThaiFiscalYear();
  const counterId = `${sequenceName}_${fiscalYear}`;

  let result;
  try {
    result = await counters.findOneAndUpdate(
      { _id: counterId },
      { $inc: { sequence_value: 1 } },
      {
        upsert: true,
        returnDocument: 'after', // For MongoDB Node Driver v4+
      }
    );
  } catch (err) {
    console.error('⚠️ Mongo error during findOneAndUpdate:', err);
  }

  let value = result?.value?.sequence_value;

  if (typeof value !== 'number') {
    const fallback = await counters.findOne({ _id: counterId });
    if (!fallback || typeof fallback.sequence_value !== 'number') {
      throw new Error('ไม่สามารถดึงเลขลำดับได้จาก fallback');
    }
    value = fallback.sequence_value;
  }

  const yearSuffix = String(fiscalYear % 100).padStart(2, '0');
  const number = value.toString().padStart(4, '0');
  return `CMP-${yearSuffix}${number}`;
}