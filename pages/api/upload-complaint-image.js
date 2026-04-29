import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";

function isOurCloudinaryImageUrl(url) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName || typeof url !== "string") return false;
  if (!url.startsWith("https://res.cloudinary.com/")) return false;
  try {
    const pathname = new URL(url).pathname;
    return (
      pathname.startsWith(`/${cloudName}/`) &&
      pathname.includes("/image/upload/")
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();
    const { reportId, imageUrl } = req.body;

    if (!reportId || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: "ต้องระบุ reportId และ imageUrl",
      });
    }

    if (!isOurCloudinaryImageUrl(imageUrl)) {
      return res.status(400).json({
        success: false,
        message: "URL รูปไม่ถูกต้อง",
      });
    }

    const report = await SubmittedReport.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบเรื่องร้องเรียนนี้",
      });
    }

    const updatedImages = [...(report.images || []), imageUrl];

    const updatedReport = await SubmittedReport.findByIdAndUpdate(
      reportId,
      {
        images: updatedImages,
        updatedAt: new Date(),
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "อัปโหลดภาพสำเร็จ",
      data: updatedReport,
      newImageUrl: imageUrl,
    });
  } catch (error) {
    console.error("Error in upload-complaint-image:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการอัปโหลดภาพ",
      error: error.message,
    });
  }
}
