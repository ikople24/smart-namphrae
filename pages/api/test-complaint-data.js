import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();
    
    // ดึงข้อมูลตัวอย่างจากฐานข้อมูล
    const sampleComplaints = await SubmittedReport.find({}).limit(3).select('_id detail images createdAt updatedAt fullName phone');
    

    
    return res.status(200).json({
      success: true,
      message: "ข้อมูลตัวอย่างจากฐานข้อมูล",
      data: sampleComplaints,
      count: sampleComplaints.length
    });

  } catch (error) {

    return res.status(500).json({ 
      success: false, 
      message: "เกิดข้อผิดพลาดในการทดสอบข้อมูล",
      error: error.message 
    });
  }
} 