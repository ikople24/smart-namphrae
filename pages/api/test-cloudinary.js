export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const config = {
      hasCloudName: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      hasUploadPreset: !!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    };

    if (!config.hasCloudName || !config.hasUploadPreset) {
      return res.status(500).json({
        success: false,
        message: "Cloudinary configuration missing",
        config
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cloudinary configuration is valid",
      config
    });

  } catch (error) {
    console.error("Error testing Cloudinary config:", error);
    return res.status(500).json({
      success: false,
      message: "Error testing Cloudinary configuration",
      error: error.message
    });
  }
}
