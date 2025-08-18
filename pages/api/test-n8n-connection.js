// pages/api/test-n8n-connection.js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔍 Testing n8n webhook connection...");
    
    const testPayload = {
      complaintId: "TEST-" + Date.now(),
      fullName: "Test User",
      phone: "0812345678",
      community: "Test Community",
      problems: ["Test Problem"],
      category: "Test Category",
      images: ["https://example.com/test.jpg"],
      detail: "This is a test connection",
      location: { lat: 13.7563, lng: 100.5018 },
      status: "อยู่ระหว่างดำเนินการ",
      officer: "Test Officer",
      _id: "test-id-" + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resendNotification: false,
      notificationCount: 1,
      lastNotificationSent: new Date().toISOString(),
      isTestConnection: true
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
    
    if (webhookRes.ok) {
      const webhookData = await webhookRes.text();
      console.log("✅ n8n webhook success:", webhookData);
      
      res.status(200).json({
        success: true,
        status: "connected",
        message: "n8n webhook is working properly",
        response: webhookData
      });
    } else {
      const errorText = await webhookRes.text();
      console.error("🚨 n8n webhook failed:", webhookRes.status, errorText);
      
      res.status(200).json({
        success: false,
        status: "error",
        message: "n8n webhook is not responding properly",
        error: `HTTP ${webhookRes.status}`,
        details: errorText
      });
    }
    
  } catch (error) {
    console.error("❌ n8n connection test failed:", error);
    
    res.status(200).json({
      success: false,
      status: "unreachable",
      message: "Cannot reach n8n webhook",
      error: error.message
    });
  }
} 