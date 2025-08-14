import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  await dbConnect();

  switch (method) {
    case "PUT":
      try {
        const { location, images, detail, fullName, phone } = req.body;
        
        // สร้าง object สำหรับอัปเดต
        const updateData = {};
        
        // อัปเดตพิกัด
        if (location && typeof location.lat === "number" && typeof location.lng === "number") {
          updateData.location = location;
        }
        
        // อัปเดตภาพ
        if (images && Array.isArray(images)) {
          updateData.images = images;
        }
        
        // อัปเดตรายละเอียด
        if (detail !== undefined) {
          updateData.detail = detail;
        }
        
        // อัปเดตชื่อผู้แจ้ง
        if (fullName !== undefined) {
          updateData.fullName = fullName;
        }
        
        // อัปเดตเบอร์โทร
        if (phone !== undefined) {
          updateData.phone = phone;
        }
        
        // อัปเดตเวลาที่แก้ไข
        updateData.updatedAt = new Date();

        const updatedReport = await SubmittedReport.findByIdAndUpdate(
          id,
          updateData,
          { new: true }
        );

        if (!updatedReport) {
          return res.status(404).json({ success: false, message: "ไม่พบเรื่องร้องเรียนนี้" });
        }

        return res.status(200).json({ success: true, data: updatedReport });
      } catch (error) {

        return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด", error: error.message });
      }
    case "DELETE":
      try {
        const deletedReport = await SubmittedReport.findByIdAndDelete(id);
        if (!deletedReport) {
          return res.status(404).json({ success: false, message: "ไม่พบเรื่องร้องเรียนนี้" });
        }
        return res.status(200).json({ success: true, message: "ลบเรียบร้อยแล้ว" });
      } catch (error) {
        return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด", error });
      }
    default:
      res.setHeader("Allow", ["PUT", "DELETE"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}