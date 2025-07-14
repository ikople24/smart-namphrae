import dbConnect from "@/lib/dbConnect";
import SubmittedReport2024 from "@/models/SubmittedReport2024";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const data = await SubmittedReport2024.find({});

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error loading submittedreports_2024:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูล" });
  }
}