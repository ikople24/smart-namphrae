export async function uploadToCloudinary(file) {
  try {
    console.log("📤 Uploading image to Cloudinary:", file.name);
    
    const resized = await resizeImage(file);

    const formData = new FormData();
    formData.append("file", resized);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    if (!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      throw new Error("Cloudinary configuration missing");
    }

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || `Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    console.log("✅ Image uploaded successfully:", data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error("❌ Upload to Cloudinary failed:", error);
    throw error;
  }
}

// ฟังก์ชันช่วยปรับขนาดภาพก่อนอัปโหลด
function resizeImage(file, maxWidth = 1024, maxHeight = 1024) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height *= maxWidth / width;
          width = maxWidth;
        } else {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        const resizedFile = new File([blob], file.name, { type: file.type });
        resolve(resizedFile);
      }, file.type);
    };
    img.src = URL.createObjectURL(file);
  });
}