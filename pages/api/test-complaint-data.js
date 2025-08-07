// pages/api/test-complaint-data.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🧪 Testing complaint data to n8n...");
    
    const testComplaintData = {
      // ข้อมูลหลัก
      complaintId: "CMP-TEST-001",
      fullName: "ทดสอบ ระบบ",
      phone: "0812345678",
      community: "บ้านบ่อ",
      problems: ["ถนนเสียหาย", "ไฟส่องสว่างไม่เพียงพอ"],
      category: "ถนน",
      images: ["https://example.com/test-image-1.jpg", "https://example.com/test-image-2.jpg"],
      detail: "ถนนในชุมชนมีหลุมบ่อและไฟส่องสว่างไม่เพียงพอในเวลากลางคืน",
      location: { 
        lat: 18.7883, 
        lng: 98.9853 
      },
      status: "อยู่ระหว่างดำเนินการ",
      officer: "",
      
      // ข้อมูลเพิ่มเติม
      _id: "507f1f77bcf86cd799439011",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // ข้อมูลการทดสอบ
      resendNotification: false,
      notificationCount: 1,
      lastNotificationSent: new Date().toISOString(),
      testMode: true
    };

    console.log("📤 Sending test data to n8n:", JSON.stringify(testComplaintData, null, 2));

    const webhookRes = await fetch(
      "https://primary-production-a1769.up.railway.app/webhook/submit-namphare",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "Smart-Namphare-App/1.0"
        },
        body: JSON.stringify(testComplaintData),
        timeout: 10000, // 10 second timeout
      }
    );

    console.log("📡 n8n test response status:", webhookRes.status);
    
    if (!webhookRes.ok) {
      const errorText = await webhookRes.text();
      console.error("🚨 n8n test failed:", webhookRes.status, errorText);
      return res.status(500).json({
        success: false,
        error: "n8n test failed",
        status: webhookRes.status,
        details: errorText
      });
    }

    const responseText = await webhookRes.text();
    console.log("✅ n8n test success:", responseText);
    
    res.status(200).json({
      success: true,
      message: "Test complaint data sent successfully",
      status: webhookRes.status,
      response: responseText,
      sentData: testComplaintData
    });

  } catch (error) {
    console.error("❌ Test complaint data error:", error);
    res.status(500).json({
      success: false,
      error: "Test complaint data failed",
      details: error.message
    });
  }
} 