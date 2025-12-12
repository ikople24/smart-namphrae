/**
 * ⚡ แปลง Cloudinary URL ให้โหลดรูปที่ optimize แล้ว (เล็กลง, เร็วขึ้น)
 * @param {string} url - Cloudinary URL
 * @param {number} width - ความกว้างที่ต้องการ (default: 400px สำหรับ thumbnail)
 * @param {string} quality - คุณภาพรูป (default: auto)
 * @returns {string} - Optimized URL
 */
export function getOptimizedCloudinaryUrl(url, width = 400, quality = 'auto') {
  if (!url || typeof url !== 'string') return url;
  
  // ตรวจสอบว่าเป็น Cloudinary URL หรือไม่
  if (!url.includes('cloudinary.com')) return url;
  
  // แทรก transformation หลัง /upload/
  const transformation = `w_${width},q_${quality},f_auto,c_limit`;
  return url.replace('/upload/', `/upload/${transformation}/`);
}

export async function uploadToCloudinary(fileOrBase64) {
  try {
    console.log("📤 Uploading image to Cloudinary");
    
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      throw new Error("Cloudinary configuration missing");
    }

    let uploadData;
    
    // Check if input is base64 string or File object
    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
      // Handle base64 string - upload directly
      uploadData = fileOrBase64;
    } else if (fileOrBase64 instanceof File) {
      // Handle File object - for client-side usage
      const resizedFile = await resizeImage(fileOrBase64);
      uploadData = resizedFile;
    } else {
      throw new Error("Invalid input: must be a File object or base64 string");
    }

    // Create FormData and upload
    const formData = new FormData();
    formData.append("file", uploadData);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Image uploaded successfully:", data.secure_url);
    
    // Return URL string for backward compatibility
    return data.secure_url;
  } catch (error) {
    console.error("❌ Upload to Cloudinary failed:", error);
    throw error;
  }
}

// Convert base64 string to File object (for client-side usage)
function base64ToFile(base64String) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
      // Resize image if needed
      const maxWidth = 1024;
      const maxHeight = 1024;
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
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg');
    };
    
    img.src = base64String;
  });
}

// ฟังก์ชันช่วยปรับขนาดภาพก่อนอัปโหลด (for File objects)
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