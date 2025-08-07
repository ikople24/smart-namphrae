// pages/api/health-check.js
import dbConnect from "@/lib/dbConnect";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    services: {
      database: "unknown",
      cloudinary: "unknown",
      n8n: "unknown"
    },
    environment: {
      hasMongoUri: !!process.env.MONGO_URI,
      hasCloudinaryConfig: !!(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET),
      hasAppId: !!process.env.NEXT_PUBLIC_APP_ID,
    }
  };

  try {
    // ตรวจสอบ Database
    try {
      await dbConnect();
      healthStatus.services.database = "connected";
    } catch (dbError) {
      healthStatus.services.database = "error";
      healthStatus.status = "degraded";
      console.error("Database connection error:", dbError);
    }

    // ตรวจสอบ Cloudinary
    try {
      if (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
        healthStatus.services.cloudinary = "configured";
      } else {
        healthStatus.services.cloudinary = "not_configured";
        healthStatus.status = "degraded";
      }
    } catch (error) {
      healthStatus.services.cloudinary = "error";
      healthStatus.status = "degraded";
      console.error("Cloudinary configuration error:", error);
    }

    // ตรวจสอบ n8n Webhook
    try {
      const n8nResponse = await fetch(
        "https://primary-production-a1769.up.railway.app/webhook/submit-namphare",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
          timeout: 5000,
        }
      );
      
      if (n8nResponse.ok) {
        healthStatus.services.n8n = "reachable";
      } else {
        healthStatus.services.n8n = "unreachable";
        healthStatus.status = "degraded";
      }
    } catch (n8nError) {
      healthStatus.services.n8n = "error";
      healthStatus.status = "degraded";
      console.error("n8n webhook error:", n8nError);
    }

    // กำหนด status code
    const statusCode = healthStatus.status === "healthy" ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error("Health check error:", error);
    healthStatus.status = "error";
    res.status(500).json(healthStatus);
  }
} 