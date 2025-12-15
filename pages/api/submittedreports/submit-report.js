// pages/api/submit-report.js
import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";
import getNextSequence from "@/lib/getNextSequence";

// รายการปัญหาที่มีการจำกัดจำนวนต่อวัน
const DAILY_LIMITED_PROBLEMS = {
  "ขอรถรับ-ส่งไปโรงพยาบาล": {
    limit: 3,
    labelEn: "Hospital Transport Request"
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();
    
    // ตรวจสอบการส่งซ้ำโดยดูจากข้อมูลที่สำคัญ
    const { fullName, phone, community, category, problems } = req.body;

    // ตรวจสอบ daily limit สำหรับปัญหาที่มีการจำกัด
    if (problems && Array.isArray(problems)) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      for (const problem of problems) {
        const limitConfig = DAILY_LIMITED_PROBLEMS[problem];
        if (limitConfig) {
          const todayCount = await SubmittedReport.countDocuments({
            problems: problem,
            createdAt: { 
              $gte: startOfDay, 
              $lte: endOfDay 
            }
          });

          if (todayCount >= limitConfig.limit) {
            return res.status(429).json({ 
              success: false, 
              error: `วันนี้มีการ "${problem}" ครบ ${limitConfig.limit} ครั้งแล้ว กรุณารอวันถัดไป`,
              errorCode: "DAILY_LIMIT_REACHED",
              problem,
              limit: limitConfig.limit,
              todayCount
            });
          }
        }
      }
    }
    
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
    
    // ทำความสะอาด detail field ก่อนบันทึก
    const cleanDetail = (req.body.detail || '').replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // ลบ updatedAt ที่ส่งมาจาก frontend เพราะจะถูกสร้างโดย Mongoose
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt, ...dataToSave } = req.body;
    
    const newReport = await SubmittedReport.create({
      ...dataToSave,
      detail: cleanDetail,
      complaintId,
      lastNotificationSent: new Date(),
      notificationCount: 1,
    });

    console.log("💾 Saved to database:", newReport._id);

    // 🔔 POST ไปยัง n8n webhook with improved error handling
    try {
      console.log("🚀 Sending to n8n webhook...");
      const webhookPayload = {
        // ข้อมูลหลัก
        complaintId: newReport.complaintId,
        fullName: newReport.fullName || '',
        phone: newReport.phone || '',
        community: newReport.community || '',
        problems: newReport.problems || [],
        category: newReport.category || '',
        images: newReport.images || [],
        detail: newReport.detail || '',
        location: newReport.location || {},
        status: newReport.status || 'อยู่ระหว่างดำเนินการ',
        officer: newReport.officer || '',
        
        // ข้อมูลเพิ่มเติม
        _id: newReport._id.toString(),
        createdAt: newReport.createdAt instanceof Date ? newReport.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: newReport.updatedAt instanceof Date ? newReport.updatedAt.toISOString() : new Date().toISOString(),
        
        // ข้อมูลการส่งครั้งแรก
        resendNotification: false,
        notificationCount: 1,
        lastNotificationSent: new Date().toISOString()
      };

      console.log("📤 Payload to n8n (first time):", JSON.stringify(webhookPayload, null, 2));

      const webhookRes = await fetch(
        "https://primary-production-a1769.up.railway.app/webhook/submit-namphare",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "User-Agent": "Smart-Namphare-App/1.0"
          },
          body: JSON.stringify(webhookPayload),
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
