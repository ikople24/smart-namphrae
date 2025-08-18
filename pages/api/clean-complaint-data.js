// pages/api/clean-complaint-data.js
import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";

// ฟังก์ชันทำความสะอาดข้อความ detail เท่านั้น
function cleanDetailText(text) {
  if (!text) return '';
  
  return text
    // ลบการขึ้นบรรทัดใหม่
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    // ลบอักขระพิเศษที่อาจทำให้ n8n error (แต่คงภาษาไทยไว้)
    .replace(/[^\u0E00-\u0E7F\s.,!?()\[\]{}"'\-]/g, '')
    // ลบช่องว่างซ้ำ
    .replace(/\s+/g, ' ')
    // ตัดช่องว่างหัวท้าย
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();
    
    const { complaintId } = req.body;

    if (!complaintId) {
      return res.status(400).json({ error: "complaintId is required" });
    }

    console.log("🧹 Cleaning complaint data:", complaintId);
    
    // ค้นหา complaint
    let complaint = await SubmittedReport.findOne({ complaintId });
    
    if (!complaint) {
      complaint = await SubmittedReport.findById(complaintId);
    }
    
    if (!complaint) {
      return res.status(404).json({ 
        error: "Complaint not found",
        searchedId: complaintId
      });
    }

    console.log("✅ Found complaint:", complaint._id);
    
    // เก็บข้อมูลเดิมเพื่อเปรียบเทียบ
    const originalData = {
      detail: complaint.detail
    };
    
    // ทำความสะอาดเฉพาะ detail
    const cleanedData = {
      detail: cleanDetailText(complaint.detail)
    };
    
    // ตรวจสอบการเปลี่ยนแปลง
    const changes = [];
    
    if (originalData.detail !== cleanedData.detail) {
      changes.push(`detail: "${originalData.detail?.substring(0, 50)}..." → "${cleanedData.detail?.substring(0, 50)}..."`);
    }
    
    // อัปเดตเฉพาะ detail ในฐานข้อมูล
    const updateResult = await SubmittedReport.updateOne(
      { _id: complaint._id },
      { 
        $set: {
          detail: cleanedData.detail,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log("✅ Updated complaint data:", updateResult);
    
    // ทดสอบส่งข้อมูลที่ทำความสะอาดแล้ว
    let testResult = null;
    try {
      const cleanPayload = {
        complaintId: complaint.complaintId,
        fullName: complaint.fullName || '',
        phone: complaint.phone || '',
        community: complaint.community || '',
        problems: Array.isArray(complaint.problems) ? complaint.problems : [],
        category: complaint.category || '',
        images: Array.isArray(complaint.images) ? complaint.images : [],
        detail: cleanedData.detail, // ใช้ detail ที่ทำความสะอาดแล้ว
        location: complaint.location || { lat: 0, lng: 0 },
        status: complaint.status || 'อยู่ระหว่างดำเนินการ',
        officer: complaint.officer || '',
        _id: complaint._id.toString(),
        createdAt: complaint.createdAt ? complaint.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resendNotification: true,
        resendTimestamp: new Date().toISOString(),
        notificationCount: (complaint.notificationCount || 0) + 1,
        lastNotificationSent: new Date().toISOString()
      };
      
      console.log("🧪 Testing cleaned payload...");
      
      const webhookRes = await fetch(
        "https://primary-production-a1769.up.railway.app/webhook/submit-namphare",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "User-Agent": "Smart-Namphare-App/1.0"
          },
          body: JSON.stringify(cleanPayload),
          timeout: 10000,
        }
      );
      
      const responseText = await webhookRes.text();
      
      testResult = {
        status: webhookRes.status,
        ok: webhookRes.ok,
        response: responseText,
        success: webhookRes.ok
      };
      
      console.log("📡 Clean test result:", webhookRes.status, responseText);
      
    } catch (webhookError) {
      testResult = {
        error: webhookError.message,
        status: 'network_error',
        success: false
      };
      console.error("🚨 Clean test failed:", webhookError.message);
    }
    
    res.status(200).json({
      success: true,
      complaintId: complaint.complaintId,
      originalData,
      cleanedData,
      changes,
      updateResult,
      testResult,
      hasChanges: changes.length > 0,
      testSuccess: testResult ? testResult.success : false
    });
    
  } catch (error) {
    console.error("❌ Clean complaint data error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Clean complaint data failed",
      details: error.message 
    });
  }
}
