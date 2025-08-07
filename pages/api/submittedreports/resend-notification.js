// pages/api/submittedreports/resend-notification.js
import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";

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

    // ค้นหา complaint จาก database
    console.log("🔍 Searching for complaint with ID:", complaintId);
    
    // ลองค้นหาด้วย complaintId ก่อน
    let complaint = await SubmittedReport.findOne({ complaintId });
    console.log("🔍 Search by complaintId result:", complaint ? "Found" : "Not found");
    
    // หากไม่พบ ให้ลองค้นหาด้วย _id
    if (!complaint) {
      console.log("🔍 Trying to find by _id:", complaintId);
      try {
        complaint = await SubmittedReport.findById(complaintId);
        console.log("🔍 Search by _id result:", complaint ? "Found" : "Not found");
      } catch (error) {
        console.error("❌ Error searching by _id:", error);
      }
    }
    
    if (!complaint) {
      console.error("❌ Complaint not found with complaintId or _id:", complaintId);
      
      // ลองค้นหาข้อมูลทั้งหมดเพื่อ debug
      const allComplaints = await SubmittedReport.find({}).limit(3).lean();
      console.log("🔍 Sample complaints in database:", allComplaints.map(c => ({
        _id: c._id.toString(),
        complaintId: c.complaintId,
        fullName: c.fullName
      })));
      
      return res.status(404).json({ 
        error: "Complaint not found",
        searchedId: complaintId,
        sampleComplaints: allComplaints.map(c => ({
          _id: c._id.toString(),
          complaintId: c.complaintId,
          fullName: c.fullName
        }))
      });
    }

    console.log("✅ Found complaint:", complaint._id);
    console.log("📋 Complaint data:", JSON.stringify(complaint.toObject(), null, 2));

    console.log("🔄 Resending notification for complaintId:", complaintId);

    // ส่งข้อมูลไปยัง n8n webhook อีกครั้ง
    try {
      console.log("🚀 Sending to n8n webhook (resend)...");
      
      const payload = {
        // ข้อมูลหลัก
        complaintId: complaint.complaintId,
        fullName: complaint.fullName || '',
        phone: complaint.phone || '',
        community: complaint.community || '',
        problems: Array.isArray(complaint.problems) ? complaint.problems : [],
        category: complaint.category || '',
        images: Array.isArray(complaint.images) ? complaint.images : [],
        detail: complaint.detail || '',
        location: complaint.location || { lat: 0, lng: 0 },
        status: complaint.status || 'อยู่ระหว่างดำเนินการ',
        officer: complaint.officer || '',
        
        // ข้อมูลเพิ่มเติม
        _id: complaint._id.toString(),
        createdAt: complaint.createdAt ? complaint.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: complaint.updatedAt ? complaint.updatedAt.toISOString() : new Date().toISOString(),
        
        // ข้อมูลการส่งซ้ำ
        resendNotification: true,
        resendTimestamp: new Date().toISOString(),
        notificationCount: (complaint.notificationCount || 0) + 1,
        lastNotificationSent: new Date().toISOString()
      };
      
      console.log("📤 Payload to n8n:", JSON.stringify(payload, null, 2));
      
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!payload.complaintId) {
        throw new Error("Missing complaintId in payload");
      }
      
      if (!payload.fullName) {
        console.warn("⚠️ Missing fullName in payload");
      }
      
      if (!payload.community) {
        console.warn("⚠️ Missing community in payload");
      }
      
      const webhookRes = await fetch(
        "https://primary-production-a1769.up.railway.app/webhook/submit-namphare",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "User-Agent": "Smart-Namphare-App/1.0"
          },
          body: JSON.stringify(payload),
          timeout: 10000, // 10 second timeout
        }
      );

      console.log("📡 n8n webhook response status (resend):", webhookRes.status);
      
      if (!webhookRes.ok) {
        const errorText = await webhookRes.text();
        console.error("🚨 Webhook failed (resend):", webhookRes.status, errorText);
        throw new Error(`Webhook failed with status ${webhookRes.status}`);
      } else {
        const webhookData = await webhookRes.text();
        console.log("✅ n8n webhook success (resend):", webhookData);
      }

      // อัปเดต timestamp ของการส่งแจ้งเตือนล่าสุด
      await SubmittedReport.updateOne(
        { _id: complaint._id },
        { 
          $set: { 
            lastNotificationSent: new Date(),
            notificationCount: (complaint.notificationCount || 0) + 1
          } 
        }
      );

      res.status(200).json({ 
        success: true, 
        message: "Notification sent successfully",
        complaintId 
      });

    } catch (webhookError) {
      console.error("🚨 Webhook network error (resend):", webhookError.message);
      
      // แม้ว่า webhook จะล้มเหลว แต่เรายังคงอัปเดตข้อมูลใน database
      try {
        await SubmittedReport.updateOne(
          { _id: complaint._id },
          { 
            $set: { 
              lastNotificationSent: new Date(),
              notificationCount: (complaint.notificationCount || 0) + 1
            } 
          }
        );
        console.log("✅ Updated notification count despite webhook failure");
      } catch (dbError) {
        console.error("❌ Failed to update notification count:", dbError);
      }
      
      res.status(500).json({ 
        success: false, 
        error: "Failed to send notification to external service",
        details: webhookError.message,
        complaintId: complaint.complaintId,
        payload: payload
      });
    }

  } catch (error) {
    console.error("❌ Server error (resend notification):", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
} 