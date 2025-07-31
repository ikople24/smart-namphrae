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

    // 🔔 POST ไปยัง n8n webhook
    const webhookRes = await fetch(
      "https://primary-production-a1769.up.railway.app/webhook/submit-namphare",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReport),
      }
    );

    if (!webhookRes.ok) {
      const errorText = await webhookRes.text();
      console.error("🚨 Webhook failed:", webhookRes.status, errorText);
    }

    res.status(201).json({ success: true, data: newReport, complaintId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
