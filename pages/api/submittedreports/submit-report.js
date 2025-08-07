// pages/api/submit-report.js
import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";
import getNextSequence from "@/lib/getNextSequence";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();
    
    // ตรวจสอบการส่งซ้ำโดยดูจากข้อมูลที่สำคัญ
    const { fullName, phone, community, category } = req.body;
    
    // ตรวจสอบว่ามีรายงานที่คล้ายกันใน 5 นาทีที่ผ่านมาหรือไม่
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingReport = await SubmittedReport.findOne({
      fullName,
      phone,
      community,
      category,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (existingReport) {
      return res.status(409).json({ 
        success: false, 
        error: "รายงานนี้ถูกส่งไปแล้ว กรุณารอสักครู่ก่อนส่งใหม่",
        complaintId: existingReport.complaintId 
      });
    }

    const complaintId = await getNextSequence("complaintId");
    console.log("📥 Incoming body:", req.body);
    console.log("🆔 Generated complaintId:", complaintId);
    
    const newReport = await SubmittedReport.create({
      ...req.body,
      complaintId,
    });

    console.log("💾 Saved to database:", newReport._id);

    // 🔔 POST ไปยัง n8n webhook with improved error handling
    try {
      console.log("🚀 Sending to n8n webhook...");
      const webhookRes = await fetch(
        "https://primary-production-a1769.up.railway.app/webhook/submit-namphare",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "User-Agent": "Smart-Namphare-App/1.0"
          },
          body: JSON.stringify({
            ...newReport.toObject(),
            _id: newReport._id.toString(),
            createdAt: newReport.createdAt.toISOString(),
            updatedAt: newReport.updatedAt.toISOString()
          }),
          timeout: 10000, // 10 second timeout
        }
      );

      console.log("📡 n8n webhook response status:", webhookRes.status);
      
      if (!webhookRes.ok) {
        const errorText = await webhookRes.text();
        console.error("🚨 Webhook failed:", webhookRes.status, errorText);
        
        // Log the failed webhook but don't fail the entire request
        console.error("⚠️ n8n webhook failed but report was saved to database");
      } else {
        const webhookData = await webhookRes.text();
        console.log("✅ n8n webhook success:", webhookData);
      }
    } catch (webhookError) {
      console.error("🚨 Webhook network error:", webhookError.message);
      // Log the error but don't fail the entire request
      console.error("⚠️ n8n webhook network error but report was saved to database");
    }

    res.status(201).json({ success: true, data: newReport, complaintId });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
