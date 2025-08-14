import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();
    const { reportId, imageUrl } = req.body;

    if (!reportId || !imageUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "ต้องระบุ reportId และ imageUrl" 
      });
    }

    // หาเรื่องร้องเรียนและลบภาพออกจาก array
    const report = await SubmittedReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: "ไม่พบเรื่องร้องเรียนนี้" 
      });
    }

    // ลบภาพออกจาก array
    const updatedImages = report.images.filter(img => img !== imageUrl);
    
    // อัปเดตข้อมูล
    const updatedReport = await SubmittedReport.findByIdAndUpdate(
      reportId,
      { 
        images: updatedImages,
        updatedAt: new Date()
      },
      { new: true }
    );

    return res.status(200).json({ 
      success: true, 
      message: "ลบภาพสำเร็จ",
      data: updatedReport
    });

  } catch (error) {

    return res.status(500).json({ 
      success: false, 
      message: "เกิดข้อผิดพลาดในการลบภาพ",
      error: error.message 
    });
  }
} 