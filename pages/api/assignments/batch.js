// API สำหรับ batch fetch assignments หลายรายการพร้อมกัน
import dbConnect from "@/lib/dbConnect";
import Assignment from "@/models/Assignment";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { complaintIds } = req.body;

  if (!Array.isArray(complaintIds) || complaintIds.length === 0) {
    return res.status(400).json({ success: false, error: "complaintIds array is required" });
  }

  await dbConnect();

  try {
    // ⚡ ดึง assignments ทั้งหมดในครั้งเดียวแทนที่จะเรียกทีละอัน
    const assignments = await Assignment.find({ 
      complaintId: { $in: complaintIds } 
    }).lean();

    // สร้าง map เพื่อ lookup ง่าย
    const assignmentMap = {};
    assignments.forEach(assignment => {
      if (!assignmentMap[assignment.complaintId]) {
        assignmentMap[assignment.complaintId] = [];
      }
      assignmentMap[assignment.complaintId].push(assignment);
    });

    res.status(200).json({ success: true, data: assignmentMap });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}





