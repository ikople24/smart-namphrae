// pages/api/test-complaint-data.js
import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();
    
    console.log("🔍 Checking for corrupted complaint data...");
    
    // ค้นหา complaints ที่มีข้อมูลเสียหาย
    const corruptedComplaints = await SubmittedReport.find({
      $or: [
        { images: { $exists: false } },
        { problems: { $exists: false } },
        { location: { $exists: false } },
        { images: { $type: "string" } }, // ควรเป็น array
        { problems: { $type: "string" } }, // ควรเป็น array
        { location: { $type: "string" } } // ควรเป็น object
      ]
    }).limit(10);
    
    console.log(`🔍 Found ${corruptedComplaints.length} potentially corrupted complaints`);
    
    // แสดงรายละเอียดของรายการที่มีปัญหา
    const corruptedDetails = corruptedComplaints.map(complaint => ({
      complaintId: complaint.complaintId || complaint._id.toString(),
      fullName: complaint.fullName || 'N/A',
      category: complaint.category || 'N/A',
      issues: []
    }));
    
    let fixedCount = 0;
    const fixResults = [];
    
    for (const complaint of corruptedComplaints) {
      const updateData = {};
      let needsUpdate = false;
      
      // ตรวจสอบและซ่อมแซม images field
      if (!Array.isArray(complaint.images)) {
        updateData.images = [];
        needsUpdate = true;
        console.log(`🔧 Fixing images field for complaint ${complaint.complaintId || complaint._id}`);
      }
      
      // ตรวจสอบและซ่อมแซม problems field
      if (!Array.isArray(complaint.problems)) {
        updateData.problems = [];
        needsUpdate = true;
        console.log(`🔧 Fixing problems field for complaint ${complaint.complaintId || complaint._id}`);
      }
      
      // ตรวจสอบและซ่อมแซม location field
      if (!complaint.location || typeof complaint.location !== 'object') {
        updateData.location = { lat: 0, lng: 0 };
        needsUpdate = true;
        console.log(`🔧 Fixing location field for complaint ${complaint.complaintId || complaint._id}`);
      }
      
      if (needsUpdate) {
        try {
          await SubmittedReport.updateOne(
            { _id: complaint._id },
            { $set: updateData }
          );
          fixedCount++;
          fixResults.push({
            complaintId: complaint.complaintId || complaint._id,
            fixedFields: Object.keys(updateData),
            status: 'success'
          });
          console.log(`✅ Fixed complaint ${complaint.complaintId || complaint._id}`);
        } catch (error) {
          console.error(`❌ Failed to fix complaint ${complaint.complaintId || complaint._id}:`, error);
          fixResults.push({
            complaintId: complaint.complaintId || complaint._id,
            error: error.message,
            status: 'failed'
          });
        }
      }
    }
    
    // ส่งข้อมูลทดสอบไปยัง n8n
    try {
      console.log("🚀 Sending test data to n8n webhook...");
      
      const testPayload = {
        complaintId: "TEST-" + Date.now(),
        fullName: "Test User",
        phone: "0812345678",
        community: "Test Community",
        problems: ["Test Problem"],
        category: "Test Category",
        images: ["https://example.com/test.jpg"],
        detail: "This is a test complaint for data validation",
        location: { lat: 13.7563, lng: 100.5018 },
        status: "อยู่ระหว่างดำเนินการ",
        officer: "Test Officer",
        _id: "test-id-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resendNotification: false,
        notificationCount: 1,
        lastNotificationSent: new Date().toISOString(),
        isTestData: true
      };
      
      const webhookRes = await fetch(
        "https://primary-production-a1769.up.railway.app/webhook/submit-namphare",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "User-Agent": "Smart-Namphare-App/1.0"
          },
          body: JSON.stringify(testPayload),
          timeout: 10000,
        }
      );
      
      console.log("📡 n8n webhook response status:", webhookRes.status);
      
      if (!webhookRes.ok) {
        const errorText = await webhookRes.text();
        console.error("🚨 Webhook failed:", webhookRes.status, errorText);
        throw new Error(`Webhook failed with status ${webhookRes.status}`);
      } else {
        const webhookData = await webhookRes.text();
        console.log("✅ n8n webhook success:", webhookData);
      }
      
      res.status(200).json({
        success: true,
        message: "Test completed successfully",
        status: "success",
        details: {
          corruptedComplaintsFound: corruptedComplaints.length,
          fixedComplaints: fixedCount,
          fixResults: fixResults,
          corruptedDetails: corruptedDetails,
          webhookTest: "success"
        }
      });
      
    } catch (webhookError) {
      console.error("🚨 Webhook test failed:", webhookError.message);
      
      res.status(200).json({
        success: true,
        message: "Test completed with webhook failure",
        status: "partial_success",
        details: {
          corruptedComplaintsFound: corruptedComplaints.length,
          fixedComplaints: fixedCount,
          fixResults: fixResults,
          webhookTest: "failed",
          webhookError: webhookError.message
        }
      });
    }
    
  } catch (error) {
    console.error("❌ Server error (test complaint data):", error);
    res.status(500).json({ 
      success: false, 
      error: "Server error",
      details: error.message 
    });
  }
} 