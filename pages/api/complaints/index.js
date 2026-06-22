//api/complaints/index.js
import dbConnect from '@/lib/dbConnect';
import SubmittedReport from '@/models/SubmittedReport';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { userId } = getAuth(req);
      const isAdmin = !!userId;
      const projection = isAdmin ? {} : { fullName: 0, phone: 0, idCard: 0 };
      const query = req.query.status ? { status: req.query.status } : {};
      const complaints = await SubmittedReport.find(query, projection).sort({ createdAt: -1 });

      return res.status(200).json(complaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
    }
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
