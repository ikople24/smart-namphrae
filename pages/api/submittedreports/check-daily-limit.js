// pages/api/submittedreports/check-daily-limit.js
import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";

// รายการปัญหาที่มีการจำกัดจำนวนต่อวัน
const DAILY_LIMITED_PROBLEMS = {
  "ขอรถรับ-ส่งไปโรงพยาบาล": {
    limit: 2,
    labelEn: "Hospital Transport Request"
  }
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();
    
    // รับ problem label จาก query หรือ body
    const problemLabel = req.method === "GET" 
      ? req.query.problem 
      : req.body.problem;

    if (!problemLabel) {
      return res.status(400).json({ 
        error: "Problem label is required",
        hasLimit: false 
      });
    }

    // ตรวจสอบว่า problem นี้มีการจำกัดหรือไม่
    const limitConfig = DAILY_LIMITED_PROBLEMS[problemLabel];
    
    if (!limitConfig) {
      return res.status(200).json({ 
        hasLimit: false,
        problem: problemLabel
      });
    }

    // นับจำนวนครั้งที่ส่งวันนี้
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayCount = await SubmittedReport.countDocuments({
      problems: problemLabel,
      createdAt: { 
        $gte: startOfDay, 
        $lte: endOfDay 
      }
    });

    const remaining = Math.max(0, limitConfig.limit - todayCount);
    const isLimitReached = todayCount >= limitConfig.limit;

    return res.status(200).json({
      hasLimit: true,
      problem: problemLabel,
      problemEn: limitConfig.labelEn,
      limit: limitConfig.limit,
      todayCount,
      remaining,
      isLimitReached,
      message: isLimitReached 
        ? `วันนี้มีการขอรถรับ-ส่งไปโรงพยาบาลครบ ${limitConfig.limit} ครั้งแล้ว กรุณารอวันถัดไป`
        : `สามารถขอได้อีก ${remaining} ครั้งวันนี้`
    });

  } catch (error) {
    console.error("❌ Error checking daily limit:", error);
    return res.status(500).json({ 
      error: "Server error",
      hasLimit: false 
    });
  }
}

// Export สำหรับใช้ใน submit-report.js
export { DAILY_LIMITED_PROBLEMS };

