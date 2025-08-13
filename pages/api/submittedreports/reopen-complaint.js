// /pages/api/submittedreports/reopen-complaint.js
import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "PUT") {
    const { complaintId } = req.body;

    try {
      const updated = await SubmittedReport.findOneAndUpdate(
        { _id: complaintId },
        { status: "อยู่ระหว่างดำเนินการ" },
        { new: true }
      );

      if (!updated) return res.status(404).json({ message: "ไม่พบข้อมูล" });

      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
