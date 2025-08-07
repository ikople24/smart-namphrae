// pages/api/delete-image.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Extract public_id from Cloudinary URL
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) {
      console.log("⚠️ Not a Cloudinary URL, skipping deletion:", url);
      return res.status(200).json({ message: "Not a Cloudinary URL, skipped" });
    }

    const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExtension.split('.')[0]; // Remove file extension

    // Delete from Cloudinary using their API
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("❌ Missing Cloudinary credentials");
      return res.status(500).json({ error: "Cloudinary configuration missing" });
    }

    // Create signature for deletion
    const timestamp = Math.round(new Date().getTime() / 1000);
    const crypto = await import('crypto');
    const signature = crypto.default
      .createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
    
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const deleteResponse = await fetch(deleteUrl, {
      method: 'POST',
      body: formData,
    });

    if (deleteResponse.ok) {
      console.log("✅ Image deleted from Cloudinary:", publicId);
      res.status(200).json({ message: "Image deleted successfully" });
    } else {
      const errorData = await deleteResponse.text();
      console.error("❌ Failed to delete image:", errorData);
      res.status(500).json({ error: "Failed to delete image" });
    }

  } catch (error) {
    console.error("❌ Error deleting image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
} 