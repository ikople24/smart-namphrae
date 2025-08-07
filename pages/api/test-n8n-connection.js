// pages/api/test-n8n-connection.js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🧪 Testing n8n connection...");
    
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: "Connection test from Smart-Namphare App"
    };

    const webhookRes = await fetch(
      "https://primary-production-a1769.up.railway.app/webhook/submit-namphare",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "Smart-Namphare-App/1.0"
        },
        body: JSON.stringify(testData),
        timeout: 10000, // 10 second timeout
      }
    );

    console.log("📡 n8n test response status:", webhookRes.status);
    
    if (!webhookRes.ok) {
      const errorText = await webhookRes.text();
      console.error("🚨 n8n test failed:", webhookRes.status, errorText);
      return res.status(500).json({
        success: false,
        error: "n8n connection failed",
        status: webhookRes.status,
        details: errorText
      });
    }

    const responseText = await webhookRes.text();
    console.log("✅ n8n test success:", responseText);
    
    res.status(200).json({
      success: true,
      message: "n8n connection successful",
      status: webhookRes.status,
      response: responseText
    });

  } catch (error) {
    console.error("❌ n8n test error:", error);
    res.status(500).json({
      success: false,
      error: "n8n connection test failed",
      details: error.message
    });
  }
} 