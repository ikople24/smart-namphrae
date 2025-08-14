import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();
    const { reportId, imageData } = req.body;

    if (!reportId || !imageData) {
      return res.status(400).json({ 
        success: false, 
        message: "ต้องระบุ reportId และ imageData" 
      });
    }

    // หาเรื่องร้องเรียน
    const report = await SubmittedReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: "ไม่พบเรื่องร้องเรียนนี้" 
      });
    }

    // อัปโหลดภาพไปยัง Cloudinary
    const uploadResult = await uploadToCloudinary(imageData);
    
    if (!uploadResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: "เกิดข้อผิดพลาดในการอัปโหลดภาพ",
        error: uploadResult.error 
      });
    }

    // เพิ่มภาพใหม่เข้าไปใน array
    const updatedImages = [...(report.images || []), uploadResult.url];
    
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
      message: "อัปโหลดภาพสำเร็จ",
      data: updatedReport,
      newImageUrl: uploadResult.url
    });

  } catch (error) {

    return res.status(500).json({ 
      success: false, 
      message: "เกิดข้อผิดพลาดในการอัปโหลดภาพ",
      error: error.message 
    });
  }
}
